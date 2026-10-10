import { ContentCommandsTag } from '@/background/content-commands';
import { catchError } from '@/common/model/catch-error';
import { SendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';
import { Effect } from 'effect';

export function runSendStartToTab(
	tabId: number,
): Effect.Effect<void, SendToTabFailed, ContentCommandsTag> {
	const focusTabEffect = Effect.tryPromise({
		try: async () => {
			const tab = await chrome.tabs.update(tabId, { active: true });
			if (tab === undefined) return;
			await chrome.windows.update(tab.windowId, { focused: true });
		},
		catch: catchError(SendToTabFailed, 'Could not focus the collection tab'),
	});

	return Effect.gen(function* () {
		yield* Effect.log('background SendStartToTab begin', { tabId });
		yield* focusTabEffect;
		yield* (yield* ContentCommandsTag).startPageCollection(tabId);
		yield* Effect.log('background SendStartToTab content ack received', {
			tabId,
		});
	}).pipe(Effect.withLogSpan('runSendStartToTab'));
}
