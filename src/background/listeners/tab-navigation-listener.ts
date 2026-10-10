import { handleCollectionTabNavigationEffect } from '@/background/collection-tab-navigation';
import { DispatchLaneTag } from '@/background/dispatch-lane';
import type { BackgroundEnv } from '@/background/runtime/background-env';
import { Effect, Runtime } from 'effect';

export function registerTabNavigationListener(
	runtime: Runtime.Runtime<BackgroundEnv>,
): void {
	chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
		const url = changeInfo.url;
		if (url === undefined) return;

		void Runtime.runPromise(runtime)(
			Effect.flatMap(DispatchLaneTag, (lane) =>
				lane.submit(handleCollectionTabNavigationEffect(tabId, url)),
			),
		);
	});
}
