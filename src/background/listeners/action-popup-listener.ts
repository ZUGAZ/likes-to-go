import {
	runToggleMascotOnTabEffect,
	syncAllTabsActionPopupEffect,
	syncTabActionPopupEffect,
	syncTabByIdEffect,
} from '@/background/action-popup-controller';
import { registerActionClickedListener } from '@/background/infrastructure/action-popup';
import type { BackgroundEnv } from '@/background/runtime/background-env';
import { isSoundCloudUrl } from '@/common/model/url/is-soundcloud-url';
import { Runtime } from 'effect';

export function registerActionPopupListener(
	runtime: Runtime.Runtime<BackgroundEnv>,
): void {
	registerActionClickedListener((tab) => {
		const tabId = tab.id;
		if (tabId === undefined) return;
		if (!isSoundCloudUrl(tab.url)) return;

		void Runtime.runPromise(runtime)(runToggleMascotOnTabEffect(tabId));
	});

	chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
		if (changeInfo.url !== undefined) {
			void Runtime.runPromise(runtime)(
				syncTabActionPopupEffect(tabId, changeInfo.url),
			);
		}

		if (changeInfo.status === 'complete') {
			void Runtime.runPromise(runtime)(syncTabByIdEffect(tabId));
		}
	});

	chrome.tabs.onActivated.addListener(({ tabId }) => {
		void Runtime.runPromise(runtime)(syncTabByIdEffect(tabId));
	});

	void Runtime.runPromise(runtime)(syncAllTabsActionPopupEffect());
}
