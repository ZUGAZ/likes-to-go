import { registerMessageListener } from '@/background/listeners/message-listener';
import { registerTabNavigationListener } from '@/background/listeners/tab-navigation-listener';
import { makeBackgroundRuntime } from '@/background/runtime/background-runtime';
import { Effect } from 'effect';

/**
 * Initializes the background service: builds the Effect runtime from BackgroundLive,
 * registers Chrome listeners, then keeps the scope alive.
 * Listener registration runs in the same tick as long as BackgroundLive is sync.
 */
export function initBackgroundService(): void {
	const program = Effect.scoped(
		Effect.gen(function* () {
			const runtime = yield* makeBackgroundRuntime();
			registerMessageListener(runtime);
			registerTabNavigationListener(runtime);
			return yield* Effect.never;
		}),
	);

	void Effect.runPromise(program);
}
