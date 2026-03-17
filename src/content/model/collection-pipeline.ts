import { taggedStruct } from '@/common/model/tagged-struct';
import { NO_NEW_TRACKS_PASSES, WAIT_FOR_NODES_MS } from '@/content/constants';
import {
	BackgroundSenderTag,
	DomScannerTag,
	ScrollerTag,
	type SendToBackgroundFailed,
} from '@/content/infrastructure/collection-services';
import {
	initialScanState,
	type CollectionScanState,
} from '@/content/model/collect-batches';
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

interface LoopState {
	readonly scanState: CollectionScanState;
	readonly passesWithNoNewTracks: number;
}

const initialLoopState: LoopState = {
	scanState: initialScanState(),
	passesWithNoNewTracks: 0,
};

/**
 * One iteration of the collection loop: scan a batch, send it, scroll, wait.
 * Returns the next LoopState (used by Effect.iterate) or `undefined` to signal termination.
 */
function loopStep(
	current: LoopState,
): Effect.Effect<
	LoopState | undefined,
	SendToBackgroundFailed,
	DomScannerTag | BackgroundSenderTag | ScrollerTag
> {
	return Effect.gen(function* () {
		const scanner = yield* DomScannerTag;
		const sender = yield* BackgroundSenderTag;
		const scroller = yield* ScrollerTag;

		const { batch, nextState } = yield* scanner.scanBatch(current.scanState);
		const passesWithNoNewTracks = batch.noNewCards
			? current.passesWithNoNewTracks + 1
			: 0;

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

		if (passesWithNoNewTracks >= NO_NEW_TRACKS_PASSES) {
			return undefined;
		}

		yield* scroller.scrollToBottom();
		yield* Effect.sleep(WAIT_FOR_NODES_MS);

		return { scanState: nextState, passesWithNoNewTracks };
	}).pipe(Effect.withLogSpan('loopStep'));
}

/**
 * The full collection pipeline. Loops until natural termination (no new tracks)
 * or fiber interruption (cancel / ctx invalidation).
 *
 * On natural completion, sends CollectionComplete to background.
 * On SendToBackgroundFailed, sends CollectionError and returns Error outcome.
 * Fiber interruption is handled by the caller (message handler) — this effect
 * is interruptible by default.
 */
export const collectionPipeline: Effect.Effect<
	CollectionOutcome,
	never,
	DomScannerTag | BackgroundSenderTag | ScrollerTag
> = Effect.gen(function* () {
	const sender = yield* BackgroundSenderTag;

	yield* Effect.iterate(initialLoopState, {
		while: (s): s is LoopState => s !== undefined,
		body: loopStep,
	});

	yield* Effect.log('sending CollectionComplete');
	yield* sender.sendComplete();

	return Completed();
}).pipe(
	Effect.withLogSpan('collectionPipeline'),
	Effect.catchTag('SendToBackgroundFailed', (err) =>
		Effect.gen(function* () {
			const sender = yield* BackgroundSenderTag;
			const message = 'Could not read your likes list';
			yield* sender.sendError(message, err.reason).pipe(Effect.ignore);
			return OutcomeError({ message });
		}),
	),
);
