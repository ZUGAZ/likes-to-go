import { registerActionPopupListener } from '@/background/listeners/action-popup-listener';
import { registerTabNavigationListener } from '@/background/listeners/tab-navigation-listener';
import { makeBackgroundRuntime } from '@/background/runtime/background-runtime';

/**
 * Builds the background runtime synchronously and registers listeners in the first turn.
 * `runSync` throws if the layer becomes async.
 * The RPC port listener is live before any await.
 */
export function initBackgroundService(): void {
	const { runtime } = makeBackgroundRuntime();
	registerTabNavigationListener(runtime);
	registerActionPopupListener(runtime);
}
