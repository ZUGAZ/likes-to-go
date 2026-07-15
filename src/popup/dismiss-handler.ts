import { Effect, Runtime } from 'effect';

export function createPopupDismissHandler(
	runtime: Runtime.Runtime<never>,
): () => void {
	const run = Runtime.runPromise(runtime);

	return () => {
		void run(
			Effect.log('popup closed').pipe(
				Effect.tap(() => Effect.sync(() => window.close())),
			),
		);
	};
}
