import { Context, type Effect, type SubscriptionRef } from 'effect';
import type { CollectionState } from '@/common/model/collection/state';

/**
 * Service tag for the background's collection state.
 * Provided by BackgroundLive; tests can provide a SubscriptionRef directly.
 */
export class StateRefTag extends Context.Tag('StateRef')<
	StateRefTag,
	SubscriptionRef.SubscriptionRef<CollectionState>
>() {}

/**
 * Completes once session-storage hydration has finished or failed.
 * Gate anything that reads or applies state on behalf of a caller.
 */
export class CollectionStateHydratedTag extends Context.Tag(
	'CollectionStateHydrated',
)<CollectionStateHydratedTag, { readonly await: Effect.Effect<void> }>() {}
