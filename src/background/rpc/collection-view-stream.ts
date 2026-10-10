import { collectionStateToView } from '@/common/model/messaging/collection-view';
import type { CollectionView } from '@/common/model/messaging/collection-view';
import {
	CollectionStateHydratedTag,
	StateRefTag,
} from '@/background/state-ref';
import { Caller, watchState } from 'browser-extension-kit/messaging';
import { Effect, Stream } from 'effect';

/**
 * The current view first, after hydration, then every distinct change.
 * Every subscriber receives every change.
 */
export const watchCollectionView: Stream.Stream<
	CollectionView,
	never,
	Caller | StateRefTag | CollectionStateHydratedTag
> = Stream.unwrap(
	Effect.gen(function* () {
		yield* (yield* CollectionStateHydratedTag).await;
		const stateRef = yield* StateRefTag;
		return watchState(stateRef, { project: collectionStateToView });
	}),
);
