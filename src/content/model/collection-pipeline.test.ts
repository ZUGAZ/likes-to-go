import type { Track } from '@/common/model/track';
import { NO_NEW_TRACKS_PASSES } from '@/content/constants';
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
	duration_ms: 180_000,
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

function makeDomScannerStub(batches: readonly CollectionBatch[]) {
	let callIndex = 0;
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
					batchIndex: state.batchIndex + 1,
				};
				return { batch, nextState };
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
		sendError: (message) =>
			Effect.sync(() => {
				calls.push(`CollectionError:${message}`);
			}),
	});
}

const scrollerStub = Layer.succeed(ScrollerTag, {
	scrollToBottom: () => Effect.void,
});

function makeTestLayer(
	batches: readonly CollectionBatch[],
	calls: string[],
): Layer.Layer<DomScannerTag | BackgroundSenderTag | ScrollerTag> {
	return Layer.mergeAll(
		makeDomScannerStub(batches),
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
	},
): Effect.Effect<{
	fiber: Fiber.RuntimeFiber<CollectionOutcome>;
	outcome: Exit.Exit<CollectionOutcome>;
}> {
	const serviceLayer = opts?.senderLayer
		? Layer.mergeAll(
				makeDomScannerStub(batches),
				opts.senderLayer,
				scrollerStub,
			)
		: makeTestLayer(batches, calls);

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

		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(Completed());
		expect(calls).toContain('TracksBatch:2');
		expect(calls).toContain('CollectionComplete');
	});

	it('completes immediately when DOM is empty (all batches are noNewCards)', async () => {
		const calls: string[] = [];
		const emptyBatch = makeBatch([], 0, true);
		const batches = Array.from<CollectionBatch>({
			length: NO_NEW_TRACKS_PASSES,
		}).fill(emptyBatch);

		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls),
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

		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls),
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

		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const batchCalls = calls.filter((c) => c.startsWith('TracksBatch'));
		expect(batchCalls).toHaveLength(0);
	});
});
