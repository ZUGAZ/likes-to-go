import { registerActionPopupListener } from '@/background/listeners/action-popup-listener';
import { registerMessageListener } from '@/background/listeners/message-listener';
import { registerTabNavigationListener } from '@/background/listeners/tab-navigation-listener';
import { makeBackgroundRuntime } from '@/background/runtime/background-runtime';

/**
 * Builds the background runtime synchronously and registers listeners in the first turn.
 * `runSync` throws if the layer becomes async.
 * The legacy message listener and the RPC port listener are both live before any await.
 */
export function initBackgroundService(): void {
	const { runtime } = makeBackgroundRuntime();
	registerMessageListener(runtime);
	registerTabNavigationListener(runtime);
	registerActionPopupListener(runtime);
}
