import { Effect } from 'effect';

export function runCloseTab(tabId: number): Effect.Effect<void> {
	return Effect.sync(() => {
		void chrome.tabs.remove(tabId);
	});
}
