import { handleCollectionTabNavigationEffect } from '@/background/collection-tab-navigation';
import type { BackgroundEnv } from '@/background/runtime/background-env';
import { Runtime } from 'effect';

export function registerTabNavigationListener(
	runtime: Runtime.Runtime<BackgroundEnv>,
): void {
	chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
		if (changeInfo.url === undefined) return;

		void Runtime.runPromise(runtime)(
			handleCollectionTabNavigationEffect(tabId, changeInfo.url),
		);
	});
}
