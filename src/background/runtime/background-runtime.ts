import { BackgroundLive } from '@/background/background-layer';
import type { BackgroundEnv } from '@/background/runtime/background-env';
import { Effect, Layer, ManagedRuntime, Runtime } from 'effect';

export function makeBackgroundRuntime(
	layer: Layer.Layer<BackgroundEnv> = BackgroundLive,
): {
	readonly managed: ManagedRuntime.ManagedRuntime<BackgroundEnv, never>;
	readonly runtime: Runtime.Runtime<BackgroundEnv>;
} {
	const managed = ManagedRuntime.make(layer);
	const runtime = managed.runSync(
		Effect.runtime<BackgroundEnv>().pipe(
			Effect.tap(() => Effect.log('runtime initialized')),
			Effect.withLogSpan('background'),
			Effect.withLogSpan('♥️'),
		),
	);
	return { managed, runtime };
}
