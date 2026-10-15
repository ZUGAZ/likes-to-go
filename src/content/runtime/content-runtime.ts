import { Effect, Layer, Runtime, Scope } from 'effect';

export function makeContentRuntime<R>(
	layer: Layer.Layer<R>,
): Effect.Effect<Runtime.Runtime<R>, never, Scope.Scope> {
	return Layer.toRuntime(layer).pipe(
		Effect.tap(() => Effect.log('content runtime initialized')),
		Effect.withLogSpan('content'),
		Effect.withLogSpan('♥️'),
	);
}
