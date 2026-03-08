import { Effect } from 'effect';
import { initialScanState, type CollectionScanState } from '@/content/model/collect-batches';
import { NO_NEW_TRACKS_PASSES, WAIT_FOR_NODES_MS } from '@/content/constants';
import {
	BackgroundSenderTag,
	DomScannerTag,
	ScrollerTag,
	type SendError,
} from '@/content/infrastructure/collection-services';

export type CollectionOutcome =
	| { _tag: 'Completed' }
	| { _tag: 'Cancelled' }
	| { _tag: 'Error'; message: string };

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
	SendError,
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

		if (batch.rawLength > batch.tracks.length) {
			console.log(
				'[likes-to-go] content skipped invalid cards',
				batch.rawLength - batch.tracks.length,
				'raw:',
				batch.rawLength,
				'validated:',
				batch.tracks.length,
			);
		}

		if (batch.tracks.length > 0) {
			console.log(
				'[likes-to-go] content sending TracksBatch',
				batch.tracks.length,
			);
			yield* sender.sendBatch(batch.tracks);
		}

		if (passesWithNoNewTracks >= NO_NEW_TRACKS_PASSES) {
			return undefined;
		}

		yield* scroller.scrollToBottom();
		yield* Effect.sleep(WAIT_FOR_NODES_MS);

		return { scanState: nextState, passesWithNoNewTracks };
	});
}

/**
 * The full collection pipeline. Loops until natural termination (no new tracks)
 * or fiber interruption (cancel / ctx invalidation).
 *
 * On natural completion, sends CollectionComplete to background.
 * On SendError, sends CollectionError and returns Error outcome.
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

	console.log('[likes-to-go] content sending CollectionComplete');
	yield* sender.sendComplete();

	return { _tag: 'Completed' } as const;
}).pipe(
	Effect.catchTag('SendError', (err) =>
		Effect.gen(function* () {
			const sender = yield* BackgroundSenderTag;
			yield* sender.sendError(err.reason).pipe(Effect.ignore);
			return { _tag: 'Error', message: err.reason } as const;
		}),
	),
);
