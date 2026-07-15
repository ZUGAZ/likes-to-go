import { Effect } from 'effect';

import type { PopupStateUpdate } from '@/common/model/request-message/popup-state-update';
import { errorToReason } from '@/common/model/error-to-reason';

export function sendPopupStateUpdateToExtensionPages(
	update: PopupStateUpdate,
): Effect.Effect<void> {
	return Effect.tryPromise({
		try: () => chrome.runtime.sendMessage(update),
		catch: (err: unknown) => errorToReason(err),
	}).pipe(Effect.ignore);
}

export function sendPopupStateUpdateToTab(
	tabId: number,
	update: PopupStateUpdate,
): Effect.Effect<void> {
	return Effect.tryPromise({
		try: () => chrome.tabs.sendMessage(tabId, update),
		catch: (err: unknown) => errorToReason(err),
	}).pipe(Effect.ignore);
}
