import { Context, Deferred, Effect, Layer } from 'effect';

/**
 * Completing this ends the content script.
 * Invalidation and a terminal background client both complete it.
 * Entering the back/forward cache must not.
 */
export class ContentLifetimeTag extends Context.Tag('ContentLifetime')<
	ContentLifetimeTag,
	{
		readonly stop: Effect.Effect<void>;
		readonly stopped: Effect.Effect<void>;
	}
>() {}

export const ContentLifetimeLive: Layer.Layer<ContentLifetimeTag> =
	Layer.effect(
		ContentLifetimeTag,
		Effect.gen(function* () {
			const done = yield* Deferred.make<undefined>();
			return {
				stop: Deferred.succeed(done, undefined).pipe(Effect.asVoid),
				stopped: Deferred.await(done).pipe(Effect.asVoid),
			};
		}),
	);
