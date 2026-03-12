import { BackgroundLive } from '@/background/background-layer';
import type { BackgroundEnv } from '@/background/runtime/background-env';
import { Effect, Layer, Runtime, Scope } from 'effect';

export function makeBackgroundRuntime(): Effect.Effect<
	Runtime.Runtime<BackgroundEnv>,
	never,
	Scope.Scope
> {
	return Layer.toRuntime(BackgroundLive).pipe(
		Effect.tap(() => Effect.log('runtime initialized')),
		Effect.withLogSpan('background'),
		Effect.withLogSpan('♥️'),
	);
}
