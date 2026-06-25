import { errorToReason } from '@/common/model/error-to-reason';
import { Data, Effect } from 'effect';

export class SetTabActionPopupFailed extends Data.TaggedError(
	'SetTabActionPopupFailed',
)<{
	readonly tabId: number;
	readonly popupPath: string;
	readonly reason: string;
}> {}

export function setTabActionPopupEffect(
	tabId: number,
	popupPath: string,
): Effect.Effect<void, SetTabActionPopupFailed> {
	return Effect.tryPromise({
		try: () =>
			new Promise<void>((resolve, reject) => {
				chrome.action.setPopup({ tabId, popup: popupPath }, () => {
					const lastError = chrome.runtime.lastError;
					if (lastError !== undefined) {
						reject(new Error(lastError.message));
						return;
					}
					resolve();
				});
			}),
		catch: (err: unknown) =>
			new SetTabActionPopupFailed({
				tabId,
				popupPath,
				reason: errorToReason(err),
			}),
	});
}

export function registerActionClickedListener(
	handler: (tab: chrome.tabs.Tab) => void,
): void {
	chrome.action.onClicked.addListener(handler);
}
