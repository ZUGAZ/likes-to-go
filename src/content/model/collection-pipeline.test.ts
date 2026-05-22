import type { Track } from '@/common/model/track';
import { MAX_ERROR_RETRIES, NO_NEW_TRACKS_PASSES } from '@/content/constants';
import {
	BackgroundSenderTag,
	DocumentVisibilityTag,
	DomScannerTag,
	ScrollerTag,
	SendToBackgroundFailed,
} from '@/content/infrastructure/collection-services';
import type {
	CollectionBatch,
	CollectionScanState,
} from '@/content/model/collect-batches';
import {
	EMPTY_LIKES_LIST_MESSAGE,
	UNREADABLE_LIKES_LIST_MESSAGE,
} from '@/content/model/collection-error-messages';
import {
	Completed,
	OutcomeError,
	collectionPipeline,
	type CollectionOutcome,
} from '@/content/model/collection-pipeline';
import { silentLoggerLayer } from '@/test/effect-log-test';
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

interface ScanBatchMetrics {
	scanBatchCalls: number;
}

function makeDomScannerStub(
	batches: readonly CollectionBatch[],
	isLoadingIndicatorPresentResponses?: readonly boolean[],
	isErrorIndicatorPresentResponses?: readonly boolean[],
	clickRetryCalls?: string[],
	scanBatchMetrics?: ScanBatchMetrics,
) {
	let callIndex = 0;
	let loadingIndicatorCallIndex = 0;
	let errorIndicatorCallIndex = 0;
	return Layer.succeed(DomScannerTag, {
		scanBatch: (state: CollectionScanState) =>
			Effect.sync(() => {
				if (scanBatchMetrics !== undefined) {
					scanBatchMetrics.scanBatchCalls += 1;
				}
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
		sendVisibilityPaused: () =>
			Effect.sync(() => {
				calls.push('CollectionVisibilityPaused');
			}),
		sendVisibilityResumed: () =>
			Effect.sync(() => {
				calls.push('CollectionVisibilityResumed');
			}),
		sendError: (message, reason) =>
			Effect.sync(() => {
				calls.push(`CollectionError:${message}:${reason}`);
			}),
	});
}

function makeDocumentVisibilityStub(responses?: readonly boolean[]) {
	let callIndex = 0;
	return Layer.succeed(DocumentVisibilityTag, {
		isHidden: () =>
			Effect.sync(() => {
				const response = responses?.[callIndex];
				callIndex++;
				return response ?? false;
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
	scanBatchMetrics?: ScanBatchMetrics,
	documentHiddenResponses?: readonly boolean[],
): Layer.Layer<
	DomScannerTag | BackgroundSenderTag | ScrollerTag | DocumentVisibilityTag
> {
	return Layer.mergeAll(
		makeDomScannerStub(
			batches,
			isLoadingIndicatorPresentResponses,
			isErrorIndicatorPresentResponses,
			clickRetryCalls,
			scanBatchMetrics,
		),
		makeBackgroundSenderStub(calls),
		scrollerStub,
		makeDocumentVisibilityStub(documentHiddenResponses),
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
		scanBatchMetrics?: ScanBatchMetrics;
		documentHiddenResponses?: readonly boolean[];
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
					opts.scanBatchMetrics,
				),
				opts.senderLayer,
				scrollerStub,
				makeDocumentVisibilityStub(opts.documentHiddenResponses),
			)
		: makeTestLayer(
				batches,
				calls,
				opts?.isLoadingIndicatorPresentResponses,
				opts?.isErrorIndicatorPresentResponses,
				opts?.clickRetryCalls,
				opts?.scanBatchMetrics,
				opts?.documentHiddenResponses,
			);

	const pipelineLayer = Layer.mergeAll(serviceLayer, silentLoggerLayer);

	return Effect.gen(function* () {
		const fiber = yield* Effect.fork(
			collectionPipeline.pipe(Effect.provide(pipelineLayer)),
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
	it('completes after NO_NEW_TRACKS_PASSES consecutive empty batches (spinner always present)', async () => {
		const calls: string[] = [];
		const batch = makeBatch([fakeTrack, fakeTrack], 2, false);
		const emptyBatch = makeBatch([], 2, true);

		const batches = [
			batch,
			...Array.from<CollectionBatch>({ length: NO_NEW_TRACKS_PASSES }).fill(
				emptyBatch,
			),
		];

		// Spinner stays present throughout — termination is driven solely by
		// NO_NEW_TRACKS_PASSES consecutive noNewCards passes (path B).
		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(Completed());
		expect(calls).toContain('TracksBatch:2');
		expect(calls).toContain('CollectionComplete');
	});

	it('errors after final cycle when no valid tracks were collected (path A)', async () => {
		const calls: string[] = [];
		const scanBatchMetrics: ScanBatchMetrics = { scanBatchCalls: 0 };
		// Spinner absent on the very first pass — triggers the final cycle
		// regardless of passesWithNoNewTracks.
		const batch1 = makeBatch([], 0, true);
		const batches = [batch1];

		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls, {
				isLoadingIndicatorPresentResponses: [false],
				scanBatchMetrics,
			}),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(OutcomeError({ message: EMPTY_LIKES_LIST_MESSAGE }));
		expect(scanBatchMetrics.scanBatchCalls).toBe(2);

		const batchCalls = calls.filter((c) => c.startsWith('TracksBatch'));
		expect(batchCalls).toHaveLength(0);
		expect(calls).toContain(
			`CollectionError:${EMPTY_LIKES_LIST_MESSAGE}:collection pipeline finished with no valid tracks`,
		);
		expect(calls).not.toContain('CollectionComplete');
	});

	it('captures tracks loaded during the final cycle (path A)', async () => {
		const calls: string[] = [];
		const scanBatchMetrics: ScanBatchMetrics = { scanBatchCalls: 0 };
		// Spinner absent on first pass → final cycle → finds a track.
		const emptyBatch = makeBatch([], 0, true);
		const finalBatch = makeBatch([fakeTrack], 1, false);

		const batches = [emptyBatch, finalBatch];

		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls, {
				isLoadingIndicatorPresentResponses: [false],
				scanBatchMetrics,
			}),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(Completed());
		expect(scanBatchMetrics.scanBatchCalls).toBe(2);
		expect(calls).toContain('TracksBatch:1');
		expect(calls).toContain('CollectionComplete');
	});

	it('errors when DOM is empty after NO_NEW_TRACKS_PASSES passes (path B)', async () => {
		const calls: string[] = [];
		const emptyBatch = makeBatch([], 0, true);
		const batches = Array.from<CollectionBatch>({
			length: NO_NEW_TRACKS_PASSES,
		}).fill(emptyBatch);

		// Spinner stays present — termination is driven by the no-new-tracks
		// heuristic alone (path B).
		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(OutcomeError({ message: EMPTY_LIKES_LIST_MESSAGE }));
		const batchCalls = calls.filter((c) => c.startsWith('TracksBatch'));
		expect(batchCalls).toHaveLength(0);
		expect(calls).not.toContain('CollectionComplete');
		expect(calls).toContain(
			`CollectionError:${EMPTY_LIKES_LIST_MESSAGE}:collection pipeline finished with no valid tracks`,
		);
	});

	it('does not count empty passes while document is hidden and spinner is present', async () => {
		const calls: string[] = [];
		const scanBatchMetrics: ScanBatchMetrics = { scanBatchCalls: 0 };
		const emptyBatch = makeBatch([], 0, true);
		const batches = Array.from<CollectionBatch>({
			length: NO_NEW_TRACKS_PASSES + 3,
		}).fill(emptyBatch);

		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls, {
				advanceCount: 8,
				interruptAfterAdvances: 5,
				documentHiddenResponses: Array.from<boolean>({ length: 20 }).fill(true),
				scanBatchMetrics,
			}),
		);

		expect(Exit.isInterrupted(outcome)).toBe(true);
		expect(scanBatchMetrics.scanBatchCalls).toBeGreaterThan(
			NO_NEW_TRACKS_PASSES,
		);
		expect(
			calls.filter((c) => c === 'CollectionVisibilityPaused'),
		).toHaveLength(1);
		expect(calls).not.toContain('CollectionComplete');
	});

	it('resumes empty-pass counting and clears popup message when document becomes visible', async () => {
		const calls: string[] = [];
		const emptyBatch = makeBatch([], 0, true);
		const batches = Array.from<CollectionBatch>({
			length: NO_NEW_TRACKS_PASSES + 2,
		}).fill(emptyBatch);

		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls, {
				documentHiddenResponses: [true, true, false, false],
			}),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(OutcomeError({ message: EMPTY_LIKES_LIST_MESSAGE }));
		expect(
			calls.filter((c) => c === 'CollectionVisibilityPaused'),
		).toHaveLength(1);
		expect(
			calls.filter((c) => c === 'CollectionVisibilityResumed'),
		).toHaveLength(1);
		expect(calls).not.toContain('CollectionComplete');
	});

	it('does not complete on the same pass that visibility resumes', async () => {
		const calls: string[] = [];
		const scanBatchMetrics: ScanBatchMetrics = { scanBatchCalls: 0 };
		const emptyBatch = makeBatch([], 0, true);
		const batches = Array.from<CollectionBatch>({
			length: NO_NEW_TRACKS_PASSES + 3,
		}).fill(emptyBatch);

		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls, {
				documentHiddenResponses: [false, true, false, false, false],
				scanBatchMetrics,
			}),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(OutcomeError({ message: EMPTY_LIKES_LIST_MESSAGE }));
		expect(scanBatchMetrics.scanBatchCalls).toBe(5);
		expect(calls).toContain('CollectionVisibilityResumed');
		expect(calls).not.toContain('CollectionComplete');
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
			sendVisibilityPaused: () => Effect.void,
			sendVisibilityResumed: () => Effect.void,
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
			OutcomeError({ message: UNREADABLE_LIKES_LIST_MESSAGE }),
		);
		expect(calls).toContain(
			`CollectionError:${UNREADABLE_LIKES_LIST_MESSAGE}:channel closed`,
		);
	});

	it('sends multiple batches across iterations (path B)', async () => {
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

		// Spinner stays present — pipeline runs until NO_NEW_TRACKS_PASSES
		// consecutive empty passes, then exits (path B).
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

		// Spinner stays present — path B terminates after NO_NEW_TRACKS_PASSES
		// empty passes without ever sending a TracksBatch message.
		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(OutcomeError({ message: EMPTY_LIKES_LIST_MESSAGE }));
		const batchCalls = calls.filter((c) => c.startsWith('TracksBatch'));
		expect(batchCalls).toHaveLength(0);
		expect(calls).not.toContain('CollectionComplete');
	});

	it('errors when cards were parsed but none passed validation', async () => {
		const calls: string[] = [];
		const unreadableBatch: CollectionBatch = {
			tracks: [],
			parsedCount: 3,
			skippedCount: 3,
			totalValidCount: 0,
			noNewCards: true,
		};
		const batches = Array.from<CollectionBatch>({
			length: NO_NEW_TRACKS_PASSES,
		}).fill(unreadableBatch);

		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls, {
				isLoadingIndicatorPresentResponses: [true, true],
			}),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(
			OutcomeError({ message: UNREADABLE_LIKES_LIST_MESSAGE }),
		);
		expect(calls).toContain(
			`CollectionError:${UNREADABLE_LIKES_LIST_MESSAGE}:track cards found but none passed validation`,
		);
		expect(calls).not.toContain('CollectionComplete');
	});

	it('retries inline error and continues when it clears', async () => {
		const calls: string[] = [];
		const clickRetryCalls: string[] = [];

		const batch1 = makeBatch([], 0, true);
		const batch2 = makeBatch([], 0, true);
		const batches = [batch1, batch2];

		const { outcome } = await Effect.runPromise(
			runWithTestClock(batches, calls, {
				advanceCount: 15,
				// spinner absent on pass 2 → schedules final cycle (pass 3).
				isLoadingIndicatorPresentResponses: [true, false],
				// inline error call order across all three passes:
				//  pass 1 – initial check: true, retry 1: true, retry 2: false
				//  pass 2 – initial check: false
				//  pass 3 (final cycle) – initial check: false
				isErrorIndicatorPresentResponses: [true, true, false, false, false],
				clickRetryCalls,
			}),
		);

		expect(Exit.isSuccess(outcome)).toBe(true);
		const value = Exit.isSuccess(outcome) ? outcome.value : undefined;
		expect(value).toEqual(OutcomeError({ message: EMPTY_LIKES_LIST_MESSAGE }));

		expect(clickRetryCalls).toHaveLength(2);
		expect(calls).not.toContain('CollectionComplete');
		expect(calls.some((c) => c.startsWith('CollectionError:'))).toBe(true);
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
			OutcomeError({ message: UNREADABLE_LIKES_LIST_MESSAGE }),
		);

		expect(clickRetryCalls).toHaveLength(MAX_ERROR_RETRIES);
		expect(calls).toContain(
			`CollectionError:${UNREADABLE_LIKES_LIST_MESSAGE}:inline error persists after retries`,
		);
		expect(calls).not.toContain('CollectionComplete');
	});
});
