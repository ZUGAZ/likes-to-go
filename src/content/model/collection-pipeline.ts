import { taggedStruct } from '@/common/model/tagged-struct';
import { nextDelayMs, planNextPace } from '@/common/model/pacing';
import {
	ERROR_RETRY_DELAY_MS,
	MAX_ERROR_RETRIES,
	NO_NEW_TRACKS_PASSES,
} from '@/content/constants';
import {
	BackgroundSenderTag,
	DocumentVisibilityTag,
	DomScannerTag,
	ScrollerTag,
	type SendToBackgroundFailed,
} from '@/content/infrastructure/collection-services';
import {
	initialScanState,
	type CollectionScanState,
} from '@/content/model/collect-batches';
import {
	EMPTY_LIKES_LIST_MESSAGE,
	UNREADABLE_LIKES_LIST_MESSAGE,
} from '@/content/model/collection-error-messages';
import { Data, Effect, Schema } from 'effect';

const CompletedSchema = taggedStruct('Completed');
const CancelledSchema = taggedStruct('Cancelled');
const OutcomeErrorSchema = taggedStruct('Error', {
	message: Schema.String,
});

export const CollectionOutcomeSchema = Schema.Union(
	CompletedSchema,
	CancelledSchema,
	OutcomeErrorSchema,
);

export type CollectionOutcome = Schema.Schema.Type<
	typeof CollectionOutcomeSchema
>;

type Completed = Schema.Schema.Type<typeof CompletedSchema>;
export const Completed = Data.tagged<Completed>('Completed');

type Cancelled = Schema.Schema.Type<typeof CancelledSchema>;
export const Cancelled = Data.tagged<Cancelled>('Cancelled');

type OutcomeError = Schema.Schema.Type<typeof OutcomeErrorSchema>;
export const OutcomeError = Data.tagged<OutcomeError>('Error');

class InlineErrorPersisted extends Data.TaggedError('InlineErrorPersisted')<{
	readonly reason: string;
}> {}

interface LoopState {
	readonly scanState: CollectionScanState;
	readonly passesWithNoNewTracks: number;
	readonly isVisibilityPaused: boolean;
	readonly actionTimestampsMs: readonly number[];
	/**
	 * True when the loading indicator was absent at the end of the previous
	 * iteration. The next iteration is the final cycle; it runs normally and
	 * then the loop exits unconditionally, ensuring any content loaded by the
	 * last scroll is captured before the pipeline stops.
	 */
	readonly isFinalCycle: boolean;
}

type LoopStepOutcome =
	| { readonly _tag: 'Continue'; readonly state: LoopState }
	| { readonly _tag: 'Stop'; readonly scanState: CollectionScanState };

const initialLoopState: LoopState = {
	scanState: initialScanState(),
	passesWithNoNewTracks: 0,
	isVisibilityPaused: false,
	actionTimestampsMs: [],
	isFinalCycle: false,
};

function stopLoop(scanState: CollectionScanState): LoopStepOutcome {
	return { _tag: 'Stop', scanState };
}

function continueLoop(state: LoopState): LoopStepOutcome {
	return { _tag: 'Continue', state };
}

function zeroTrackCompletionMessage(scanState: CollectionScanState): string {
	if (scanState.totalParsedCount > 0) {
		return UNREADABLE_LIKES_LIST_MESSAGE;
	}

	return EMPTY_LIKES_LIST_MESSAGE;
}

function zeroTrackCompletionReason(scanState: CollectionScanState): string {
	if (scanState.totalParsedCount > 0) {
		return 'track cards found but none passed validation';
	}

	return 'collection pipeline finished with no valid tracks';
}

/**
 * One iteration of the collection loop: scan a batch, send it, scroll, wait.
 * Returns Continue with next LoopState or Stop with final scan state.
 */
function loopStep(
	current: LoopState,
): Effect.Effect<
	LoopStepOutcome,
	SendToBackgroundFailed | InlineErrorPersisted,
	DomScannerTag | BackgroundSenderTag | ScrollerTag | DocumentVisibilityTag
> {
	return Effect.gen(function* () {
		const scanner = yield* DomScannerTag;
		const sender = yield* BackgroundSenderTag;
		const scroller = yield* ScrollerTag;
		const visibility = yield* DocumentVisibilityTag;

		const { batch, nextState } = yield* scanner.scanBatch(current.scanState);

		if (batch.skippedCount > 0) {
			yield* Effect.logWarning(
				'skipped invalid tracks',
				batch.skippedCount,
				'parsed:',
				batch.parsedCount,
				'valid:',
				batch.tracks.length,
			);
		}

		if (batch.tracks.length > 0) {
			yield* Effect.log('sending TracksBatch', batch.tracks.length);
			yield* sender.sendBatch({
				tracks: batch.tracks,
				skippedTrackCount: batch.skippedCount,
			});
		}

		const retryAttempt = Effect.gen(function* () {
			const stillPresent = yield* scanner.isErrorIndicatorPresent();

			if (stillPresent) {
				yield* scanner.clickRetry();
				yield* Effect.sleep(ERROR_RETRY_DELAY_MS);

				yield* Effect.log('inline error persists after retries');

				return yield* Effect.fail(
					new InlineErrorPersisted({
						reason: 'inline error persists after retries',
					}),
				);
			}
		});

		yield* Effect.retry(retryAttempt, { times: MAX_ERROR_RETRIES - 1 });

		yield* scroller.scrollToBottom();
		const pace = planNextPace({
			actionTimestampsMs: current.actionTimestampsMs,
			nowMs: Date.now(),
			delayMs: nextDelayMs(),
		});
		yield* Effect.sleep(pace.waitMs);

		// If this was already the final cycle, stop now.
		if (current.isFinalCycle) {
			yield* Effect.log('final cycle, stopping pipeline');
			return stopLoop(nextState);
		}

		const isLoadingIndicatorPresent =
			yield* scanner.isLoadingIndicatorPresent();
		const isDocumentHidden = yield* visibility.isHidden();
		const isVisibilityPaused = isDocumentHidden && isLoadingIndicatorPresent;
		const hasJustResumed = current.isVisibilityPaused && !isVisibilityPaused;

		if (isVisibilityPaused && !current.isVisibilityPaused) {
			yield* Effect.log('document hidden, notifying visibility pause');
			yield* sender.sendVisibilityPaused();
		}

		if (hasJustResumed) {
			yield* Effect.log('document visible, notifying visibility resume');
			yield* sender.sendVisibilityResumed();
		}

		const passesWithNoNewTracks = batch.noNewCards
			? isVisibilityPaused
				? current.passesWithNoNewTracks
				: hasJustResumed
					? 0
					: current.passesWithNoNewTracks + 1
			: 0;

		if (!isLoadingIndicatorPresent) {
			yield* Effect.log('loading indicator is absent, scheduling final cycle');
			// Loading indicator is absent: schedule one final cycle to capture
			// any content loaded by the scroll we just performed.
			return continueLoop({
				scanState: nextState,
				passesWithNoNewTracks,
				isVisibilityPaused,
				actionTimestampsMs: pace.actionTimestampsMs,
				isFinalCycle: true,
			});
		}

		if (isVisibilityPaused) {
			yield* Effect.log('visibility pause active, continuing pipeline');
			return continueLoop({
				scanState: nextState,
				passesWithNoNewTracks,
				isVisibilityPaused,
				actionTimestampsMs: pace.actionTimestampsMs,
				isFinalCycle: false,
			});
		}

		if (hasJustResumed) {
			yield* Effect.log('visibility resumed, resetting empty-pass counter');
			return continueLoop({
				scanState: nextState,
				passesWithNoNewTracks,
				isVisibilityPaused,
				actionTimestampsMs: pace.actionTimestampsMs,
				isFinalCycle: false,
			});
		}

		if (passesWithNoNewTracks >= NO_NEW_TRACKS_PASSES) {
			yield* Effect.log('no new tracks, stopping pipeline');
			return stopLoop(nextState);
		}

		return continueLoop({
			scanState: nextState,
			passesWithNoNewTracks,
			isVisibilityPaused,
			actionTimestampsMs: pace.actionTimestampsMs,
			isFinalCycle: false,
		});
	}).pipe(Effect.withLogSpan('loopStep'));
}

/**
 * The full collection pipeline. Loops until natural termination (no new tracks)
 * or fiber interruption (cancel / ctx invalidation).
 *
 * On natural completion with at least one valid track, sends CollectionComplete.
 * On zero valid tracks, sends CollectionError and returns Error outcome.
 * On SendToBackgroundFailed, sends CollectionError and returns Error outcome.
 * Fiber interruption is handled by the caller (message handler) — this effect
 * is interruptible by default.
 */
export const collectionPipeline: Effect.Effect<
	CollectionOutcome,
	never,
	DomScannerTag | BackgroundSenderTag | ScrollerTag | DocumentVisibilityTag
> = Effect.gen(function* () {
	const sender = yield* BackgroundSenderTag;

	let current: LoopState = initialLoopState;
	let finalScanState: CollectionScanState = initialScanState();
	let outcome = yield* loopStep(current);

	while (outcome._tag === 'Continue') {
		current = outcome.state;
		outcome = yield* loopStep(current);
	}

	finalScanState = outcome.scanState;

	if (finalScanState.previousValidCount === 0) {
		const message = zeroTrackCompletionMessage(finalScanState);
		const reason = zeroTrackCompletionReason(finalScanState);
		yield* Effect.log('zero valid tracks collected, sending CollectionError');
		yield* sender.sendError(message, reason);
		return OutcomeError({ message });
	}

	yield* Effect.log('sending CollectionComplete');
	yield* sender.sendComplete();

	return Completed();
}).pipe(
	Effect.withLogSpan('collectionPipeline'),
	Effect.catchTag('SendToBackgroundFailed', (err) =>
		Effect.gen(function* () {
			const sender = yield* BackgroundSenderTag;
			const message = UNREADABLE_LIKES_LIST_MESSAGE;
			yield* sender.sendError(message, err.reason).pipe(Effect.ignore);
			return OutcomeError({ message });
		}),
	),
	Effect.catchTag('InlineErrorPersisted', (err) =>
		Effect.gen(function* () {
			const sender = yield* BackgroundSenderTag;
			const message = UNREADABLE_LIKES_LIST_MESSAGE;
			yield* sender.sendError(message, err.reason).pipe(Effect.ignore);
			return OutcomeError({ message });
		}),
	),
);
