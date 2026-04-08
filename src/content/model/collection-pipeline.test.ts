import type { Track } from '@/common/model/track';
import { MAX_ERROR_RETRIES, NO_NEW_TRACKS_PASSES } from '@/content/constants';
import {
	BackgroundSenderTag,
	DomScannerTag,
	ScrollerTag,
	SendToBackgroundFailed,
} from '@/content/infrastructure/collection-services';
import type {
	CollectionBatch,
	CollectionScanState,
} from '@/content/model/collect-batches';
import {
	Completed,
	OutcomeError,
	collectionPipeline,
	type CollectionOutcome,
} from '@/content/model/collection-pipeline';
import { Effect, Exit, Fiber, Layer, TestClock, TestContext } from 'effect';
import { describe, expect, it } from 'vitest';

// ── Helpers ─────────────────────────────────────────────────────

const fakeTrack: Track = {
	title: 'Test Track',
	artist: 'Test Artist',
	url: new URL('https://soundcloud.com/test/track'),
};

function makeBatch(
	tracks: readonly Track[],
	totalValidCount: number,
	noNewCards: boolean,
): CollectionBatch {
	return {
		tracks,
		parsedCount: tracks.length,
		skippedCount: 0,
		totalValidCount,
		noNewCards,
	};
}

function makeDomScannerStub(
	batches: readonly CollectionBatch[],
	isLoadingIndicatorPresentResponses?: readonly boolean[],
	isErrorIndicatorPresentResponses?: readonly boolean[],
	clickRetryCalls?: string[],
) {
	let callIndex = 0;
	let loadingIndicatorCallIndex = 0;
	let errorIndicatorCallIndex = 0;
	return Layer.succeed(DomScannerTag, {
		scanBatch: (state: CollectionScanState) =>
			Effect.sync(() => {
				const entry = batches[callIndex];
				const batch =
					entry !== undefined
						? entry
						: makeBatch([], state.previousValidCount, true);
				callIndex++;
				const nextState: CollectionScanState = {
					previousValidCount: batch.totalValidCount,
					totalParsedCount: state.totalParsedCount + batch.parsedCount,
					totalSkippedCount: state.totalSkippedCount + batch.skippedCount,
				};
				return { batch, nextState };
			}),
		isLoadingIndicatorPresent: () =>
			Effect.sync(() => {
				const response =
					isLoadingIndicatorPresentResponses?.[loadingIndicatorCallIndex];
				loadingIndicatorCallIndex++;
				// Default: spinner exists (keeps existing tests stable).
				return response ?? true;
			}),
		isErrorIndicatorPresent: () =>
			Effect.sync(() => {
				const response =
					isErrorIndicatorPresentResponses?.[errorIndicatorCallIndex];
				errorIndicatorCallIndex++;
				// Default: no inline error.
				return response ?? false;
			}),
		clickRetry: () =>
			Effect.sync(() => {
				clickRetryCalls?.push('RetryClick');
			}),
	});
}

function makeBackgroundSenderStub(calls: string[]) {
	return Layer.succeed(BackgroundSenderTag, {
		sendBatch: ({ tracks }) =>
			Effect.sync(() => {
				calls.push(`TracksBatch:${String(tracks.length)}`);
			}),
		sendComplete: () =>
			Effect.sync(() => {
				calls.push('CollectionComplete');
			}),
		sendError: (message, reason) =>
			Effect.sync(() => {
				calls.push(`CollectionError:${message}:${reason}`);
			}),
	});
}

const scrollerStub = Layer.succeed(ScrollerTag, {
	scrollToBottom: () => Effect.void,
});

function makeTestLayer(
	batches: readonly CollectionBatch[],
	calls: string[],
	isLoadingIndicatorPresentResponses?: readonly boolean[],
	isErrorIndicatorPresentResponses?: readonly boolean[],
	clickRetryCalls?: string[],
): Layer.Layer<DomScannerTag | BackgroundSenderTag | ScrollerTag> {
	return Layer.mergeAll(
		makeDomScannerStub(
			batches,
			isLoadingIndicatorPresentResponses,
			isErrorIndicatorPresentResponses,
			clickRetryCalls,
		),
		makeBackgroundSenderStub(calls),
		scrollerStub,
	);
}

/**
 * Runs the pipeline in a test context with TestClock, forking it and
 * advancing the clock for each `Effect.sleep` in the loop.
 * Returns the fiber so callers can inspect outcome or interrupt.
 */
function runWithTestClock(
	batches: readonly CollectionBatch[],
	calls: string[],
	opts?: {
		advanceCount?: number;
		interruptAfterAdvances?: number;
		senderLayer?: Layer.Layer<BackgroundSenderTag>;
		isLoadingIndicatorPresentResponses?: readonly boolean[];
		isErrorIndicatorPresentResponses?: readonly boolean[];
		clickRetryCalls?: string[];
	},
): Effect.Effect<{
	fiber: Fiber.RuntimeFiber<CollectionOutcome>;
	outcome: Exit.Exit<CollectionOutcome>;
}> {
	const serviceLayer = opts?.senderLayer
		? Layer.mergeAll(
				makeDomScannerStub(
					batches,
					opts.isLoadingIndicatorPresentResponses,
					opts.isErrorIndicatorPresentResponses,
					opts.clickRetryCalls,
				),
				opts.senderLayer,
				scrollerStub,
			)
		: makeTestLayer(
				batches,
				calls,
				opts?.isLoadingIndicatorPresentResponses,
				opts?.isErrorIndicatorPresentResponses,
				opts?.clickRetryCalls,
			);

	return Effect.gen(function* () {
		const fiber = yield* Effect.fork(
			collectionPipeline.pipe(Effect.provide(serviceLayer)),
		);

		const advanceCount = opts?.advanceCount ?? 20;
		const interruptAfter = opts?.interruptAfterAdvances;

		for (let i = 0; i < advanceCount; i++) {
			if (interruptAfter !== undefined && i === interruptAfter) {
				yield* Fiber.interrupt(fiber);
				break;
			}
			yield* TestClock.adjust('3 seconds');
		}

		const outcome = yield* Fiber.await(fiber);
		return { fiber, outcome };
	}).pipe(Effect.provide(TestContext.TestContext));
}

// ── Tests ───────────────────────────────────────────────────────

describe('collectionPipeline', () => {
	it('completes after NO_NEW_TRACKS_PASSES consecutive empty batches', async () => {
		const calls: string[] = [];
		const batch = makeBatch([fakeTrack, fakeTrack], 2, false);
		const emptyBatch = makeBatch([], 2, true);

		const batches = [
			batch,
			...Array.from<CollectionBatch>({ length: NO_NEW_TRACKS_PASSES }).fill(
				emptyBatch,
			),
		];

		// The pipeline stops only when:
		// - spinner is absent AND
		// - we reached NO_NEW_TRACKS_PASSES consecutive `noNewCards` batches.
		// Here the first iteration has tracks, then we need 2 consecutive empty
		// passes; the spinner is absent on the second empty pass.
		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls, {
				isLoadingIndicatorPresentResponses: [true, true, false],
			}),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(Completed());
		expect(calls).toContain('TracksBatch:2');
		expect(calls).toContain('CollectionComplete');
	});

	it('terminates when loading indicator is absent after scrolling', async () => {
		const calls: string[] = [];
		const batch1 = makeBatch([], 0, true);
		const batch2 = makeBatch([], 0, true);

		const batches = [batch1, batch2];

		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls, {
				advanceCount: 5,
				// Keep spinner "present" for the first no-new pass, then "absent"
				// on the second consecutive no-new pass (passesWithNoNewTracks >= 2).
				isLoadingIndicatorPresentResponses: [true, false],
			}),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(Completed());

		const batchCalls = calls.filter((c) => c.startsWith('TracksBatch'));
		expect(batchCalls).toHaveLength(0);
		expect(calls).toContain('CollectionComplete');
	});

	it('completes immediately when DOM is empty (all batches are noNewCards)', async () => {
		const calls: string[] = [];
		const emptyBatch = makeBatch([], 0, true);
		const batches = Array.from<CollectionBatch>({
			length: NO_NEW_TRACKS_PASSES,
		}).fill(emptyBatch);

		// We need 2 consecutive empty passes; spinner absence should happen on
		// the second pass.
		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls, {
				isLoadingIndicatorPresentResponses: [true, false],
			}),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(Completed());
		const batchCalls = calls.filter((c) => c.startsWith('TracksBatch'));
		expect(batchCalls).toHaveLength(0);
		expect(calls).toContain('CollectionComplete');
	});

	it('is interrupted when fiber is interrupted (simulates cancel)', async () => {
		const calls: string[] = [];
		const neverEmptyBatch = makeBatch([fakeTrack], 1, false);
		const batches = Array.from<CollectionBatch>({ length: 100 }).fill(
			neverEmptyBatch,
		);

		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls, {
				advanceCount: 10,
				interruptAfterAdvances: 2,
			}),
		);

		expect(Exit.isInterrupted(outcome)).toBe(true);
		expect(calls).toContain('TracksBatch:1');
		expect(calls).not.toContain('CollectionComplete');
	});

	it('returns Error outcome when sendBatch fails', async () => {
		const calls: string[] = [];
		const batch = makeBatch([fakeTrack], 1, false);

		const failingSender = Layer.succeed(BackgroundSenderTag, {
			sendBatch: () =>
				Effect.fail(new SendToBackgroundFailed({ reason: 'channel closed' })),
			sendComplete: () => Effect.void,
			sendError: (message, reason) =>
				Effect.sync(() => {
					calls.push(`CollectionError:${message}:${reason}`);
				}),
		});

		const { outcome } = await Effect.runPromise(
			runWithTestClock([batch], calls, { senderLayer: failingSender }),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(
			OutcomeError({ message: 'Could not read your likes list' }),
		);
		expect(calls).toContain(
			'CollectionError:Could not read your likes list:channel closed',
		);
	});

	it('sends multiple batches across iterations', async () => {
		const calls: string[] = [];
		const batch1 = makeBatch([fakeTrack], 1, false);
		const batch2 = makeBatch([fakeTrack, fakeTrack], 3, false);
		const emptyBatch = makeBatch([], 3, true);

		const batches = [
			batch1,
			batch2,
			...Array.from<CollectionBatch>({ length: NO_NEW_TRACKS_PASSES }).fill(
				emptyBatch,
			),
		];

		// Two initial batches contain tracks, then we need 2 consecutive empty
		// passes; spinner absence should happen on the second empty pass.
		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls, {
				isLoadingIndicatorPresentResponses: [true, true, true, false],
			}),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(Completed());
		expect(calls).toContain('TracksBatch:1');
		expect(calls).toContain('TracksBatch:2');
		expect(calls).toContain('CollectionComplete');
	});

	it('does not send batch when tracks array is empty', async () => {
		const calls: string[] = [];
		const emptyBatch = makeBatch([], 0, true);
		const batches = Array.from<CollectionBatch>({
			length: NO_NEW_TRACKS_PASSES,
		}).fill(emptyBatch);

		// Spinner absence should happen on the second consecutive empty pass.
		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls, {
				isLoadingIndicatorPresentResponses: [true, false],
			}),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const batchCalls = calls.filter((c) => c.startsWith('TracksBatch'));
		expect(batchCalls).toHaveLength(0);
	});

	it('retries inline error and continues when it clears', async () => {
		const calls: string[] = [];
		const clickRetryCalls: string[] = [];

		const batch1 = makeBatch([], 0, true);
		const batch2 = makeBatch([], 0, true);
		const batches = [batch1, batch2];

		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls, {
				advanceCount: 10,
				// spinner is present on pass 1, absent on pass 2.
				isLoadingIndicatorPresentResponses: [true, false],
				// inline error is present initially, clears after 2 clicks.
				// Call order:
				//  - iteration 1 initial check: true
				//  - after retry attempt 1: true
				//  - after retry attempt 2: false
				//  - iteration 2 initial check: false
				isErrorIndicatorPresentResponses: [true, true, false, false],
				clickRetryCalls,
			}),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(Completed());

		expect(clickRetryCalls).toHaveLength(2);
		expect(calls).toContain('CollectionComplete');
		expect(calls.some((c) => c.startsWith('CollectionError:'))).toBe(false);
	});

	it('fails with OutcomeError after MAX_ERROR_RETRIES when inline error persists', async () => {
		const calls: string[] = [];
		const clickRetryCalls: string[] = [];

		const batch1 = makeBatch([], 0, true);
		const batches = [batch1];

		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls, {
				advanceCount: 10,
				isErrorIndicatorPresentResponses: [
					true,
					// after attempt 1
					true,
					// after attempt 2
					true,
					// after attempt 3
					true,
				],
				clickRetryCalls,
			}),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(
			OutcomeError({ message: 'Could not read your likes list' }),
		);

		expect(clickRetryCalls).toHaveLength(MAX_ERROR_RETRIES);
		expect(calls).toContain(
			`CollectionError:Could not read your likes list:inline error persists after retries`,
		);
		expect(calls).not.toContain('CollectionComplete');
	});
});
