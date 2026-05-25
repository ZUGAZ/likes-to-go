import { Layer, Logger } from 'effect';

/**
 * Replaces Effect's default logger with a no-op so `Effect.log` / `Effect.logWarning`
 * do not write anywhere in tests.
 *
 * Use with `@effect/vitest`:
 *
 * ```ts
 * import { layer } from '@effect/vitest'
 *
 * layer(silentLoggerLayer)((it) => {
 *   it.live('runs an effect', () => myEffect)
 * })
 * ```
 */
export const silentLoggerLayer: Layer.Layer<never> = Logger.replace(
	Logger.defaultLogger,
	Logger.none,
);

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
