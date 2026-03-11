import { Runtime } from 'effect';
import { TabComplete } from '@/common/model/collection/events/tab-complete';
import { dispatchEffect } from '@/background/background-dispatch';
import type { BackgroundEnv } from '@/background/runtime/background-env';

export function registerTabUpdatedListener(
	runtime: Runtime.Runtime<BackgroundEnv>,
): void {
	chrome.tabs.onUpdated.addListener(
		(id: number, changeInfo: chrome.tabs.OnUpdatedInfo) => {
			if (changeInfo.status === 'complete') {
				void Runtime.runPromise(runtime)(
					dispatchEffect(TabComplete({ tabId: id })),
				);
			}
		},
	);
}
