import { actionPopupPathForUrl } from '@/background/action-popup-for-url';
import {
	setTabActionPopupEffect,
	SetTabActionPopupFailed,
} from '@/background/infrastructure/action-popup';
import { sendToTabEffect } from '@/common/infrastructure/chrome-messaging';
import { isMissingContentScriptReceiverReason } from '@/common/infrastructure/is-missing-content-script-receiver';
import { errorToReason } from '@/common/model/error-to-reason';
import { ToggleMascotRequest } from '@/common/model/request-message';
import { Data, Effect } from 'effect';

const TOGGLE_MASCOT_RETRY_DELAYS_MS: readonly number[] = [200, 400, 800];

class GetTabForActionPopupFailed extends Data.TaggedError(
	'GetTabForActionPopupFailed',
)<{
	readonly tabId: number;
	readonly reason: string;
}> {}

class QueryTabsForActionPopupFailed extends Data.TaggedError(
	'QueryTabsForActionPopupFailed',
)<{
	readonly reason: string;
}> {}

export function syncTabActionPopupEffect(
	tabId: number,
	rawUrl: string | undefined,
): Effect.Effect<void> {
	const popupPath = actionPopupPathForUrl(rawUrl);

	return setTabActionPopupEffect(tabId, popupPath).pipe(
		Effect.tap(() =>
			Effect.log('set tab action popup', {
				tabId,
				popupPath,
				url: rawUrl,
			}),
		),
		Effect.catchAll((error: SetTabActionPopupFailed) =>
			Effect.logWarning('Failed to set tab action popup', {
				tabId: error.tabId,
				popupPath: error.popupPath,
				reason: error.reason,
			}),
		),
	);
}

export function syncTabByIdEffect(tabId: number): Effect.Effect<void> {
	return Effect.tryPromise({
		try: () => chrome.tabs.get(tabId),
		catch: (err: unknown) =>
			new GetTabForActionPopupFailed({
				tabId,
				reason: errorToReason(err),
			}),
	}).pipe(
		Effect.flatMap((tab) =>
			syncTabActionPopupEffect(tabId, tab.url ?? tab.pendingUrl),
		),
		Effect.catchAll((error: GetTabForActionPopupFailed) =>
			Effect.logWarning('Failed to sync tab action popup by id', {
				tabId: error.tabId,
				reason: error.reason,
			}),
		),
	);
}

export function syncAllTabsActionPopupEffect(): Effect.Effect<void> {
	return Effect.tryPromise({
		try: () => chrome.tabs.query({}),
		catch: (err: unknown) =>
			new QueryTabsForActionPopupFailed({
				reason: errorToReason(err),
			}),
	}).pipe(
		Effect.flatMap((tabs) =>
			Effect.forEach(tabs, (tab) => {
				const tabId = tab.id;
				if (tabId === undefined) return Effect.void;
				return syncTabActionPopupEffect(tabId, tab.url ?? tab.pendingUrl);
			}),
		),
		Effect.catchAll((error: QueryTabsForActionPopupFailed) =>
			Effect.logWarning('Failed to sweep tab action popups', {
				reason: error.reason,
			}),
		),
	);
}

function sendToggleMascotWithRetry(
	tabId: number,
	delaysMs: readonly number[],
): Effect.Effect<void> {
	const sendEffect = sendToTabEffect(tabId, ToggleMascotRequest());

	return sendEffect.pipe(
		Effect.tap(() => Effect.log('ToggleMascot sent', { tabId })),
		Effect.catchAll((error) => {
			const [delayMs, ...remainingDelaysMs] = delaysMs;
			if (
				!isMissingContentScriptReceiverReason(error.reason) ||
				delayMs === undefined
			) {
				return Effect.logWarning('ToggleMascot send failed', {
					tabId,
					reason: error.reason,
				});
			}

			return Effect.log('ToggleMascot retry', { tabId, delayMs }).pipe(
				Effect.zipRight(Effect.sleep(delayMs)),
				Effect.zipRight(sendToggleMascotWithRetry(tabId, remainingDelaysMs)),
			);
		}),
	);
}

export function runToggleMascotOnTabEffect(tabId: number): Effect.Effect<void> {
	return sendToggleMascotWithRetry(tabId, TOGGLE_MASCOT_RETRY_DELAYS_MS).pipe(
		Effect.withLogSpan('runToggleMascotOnTab'),
	);
}
