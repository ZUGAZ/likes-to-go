import { registerMessageListener } from '@/background/listeners/message-listener';
import { registerTabUpdatedListener } from '@/background/listeners/tab-updated-listener';
import { makeBackgroundRuntime } from '@/background/runtime/background-runtime';
import { Effect } from 'effect';

/**
 * Initializes the background service: builds the Effect runtime from BackgroundLive,
 * registers Chrome listeners (message + tab complete), then keeps the scope alive.
 * Listener registration runs in the same tick as long as BackgroundLive is sync.
 */
export function initBackgroundService(): void {
	const program = Effect.scoped(
		Effect.gen(function* () {
			const runtime = yield* makeBackgroundRuntime();
			registerMessageListener(runtime);
			registerTabUpdatedListener(runtime);
			return yield* Effect.never;
		}),
	);

	void Effect.runPromise(program);
}
