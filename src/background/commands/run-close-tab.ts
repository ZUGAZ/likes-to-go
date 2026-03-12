import { Effect } from 'effect';

export function runCloseTab(tabId: number): Effect.Effect<void> {
	return Effect.gen(function* () {
		yield* Effect.log(tabId);

		yield* Effect.sync(() => {
			void chrome.tabs.remove(tabId);
		});
	}).pipe(Effect.withLogSpan('runCloseTab'));
}
