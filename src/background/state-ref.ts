import { Context, Ref } from 'effect';
import type { CollectionState } from '@/common/model/collection/state';

/**
 * Service tag for the background's collection state ref.
 * Provided by BackgroundLive; tests can provide a Ref directly.
 */
export class StateRefTag extends Context.Tag('StateRef')<
	StateRefTag,
	Ref.Ref<CollectionState>
>() {}
