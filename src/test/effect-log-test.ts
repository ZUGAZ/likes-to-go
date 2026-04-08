import { Effect, Layer, Logger } from 'effect';

/**
 * Replaces Effect's default logger with a no-op so `Effect.log` / `Effect.logWarning`
 * do not write anywhere in tests.
 *
 * Use `Layer.mergeAll(..., silentLoggerLayer)` or `runPromise*WithSilentLogger` instead
 * of `HeartLoggerLive` in tests so the production heart logger never attaches to console.
 */
export const silentLoggerLayer: Layer.Layer<never> = Logger.replace(
	Logger.defaultLogger,
	Logger.none,
);

export function runPromiseWithSilentLogger<A, E>(
	effect: Effect.Effect<A, E>,
): Promise<A> {
	return Effect.runPromise(effect.pipe(Effect.provide(silentLoggerLayer)));
}

export function runPromiseExitWithSilentLogger<A, E>(
	effect: Effect.Effect<A, E>,
) {
	return Effect.runPromiseExit(effect.pipe(Effect.provide(silentLoggerLayer)));
}

export interface CapturingLogger {
	readonly layer: Layer.Layer<never>;
	readonly messages: () => readonly unknown[];
}

/**
 * Logger that records `message` payloads from `Effect.log` / `Effect.logWarning`, etc.
 * Create a fresh instance per test that asserts on log output.
 */
export function makeCapturingLogger(): CapturingLogger {
	const entries: unknown[] = [];
	const capturingLogger = Logger.make(({ message }) => {
		entries.push(message);
	});
	return {
		layer: Logger.replace(Logger.defaultLogger, capturingLogger),
		messages: () => [...entries],
	};
}
