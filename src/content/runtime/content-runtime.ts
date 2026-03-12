import { Effect, Layer, Runtime, Scope } from 'effect';
import { ContentLive } from '@/content/runtime/content-layer';
import type { ContentEnv } from '@/content/runtime/content-env';

export function makeContentRuntime(): Effect.Effect<
	Runtime.Runtime<ContentEnv>,
	never,
	Scope.Scope
> {
	return Layer.toRuntime(ContentLive).pipe(
		Effect.tap(() => Effect.log('content runtime initialized')),
		Effect.withLogSpan('content'),
		Effect.withLogSpan('♥️'),
	);
}
