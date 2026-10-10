import { actionPopupPathForUrl } from '@/background/action-popup-for-url';
import { ContentCommandsTag } from '@/background/content-commands';
import {
	setTabActionPopupEffect,
	SetTabActionPopupFailed,
} from '@/background/infrastructure/action-popup';
import { errorToReason } from '@/common/model/error-to-reason';
import { Data, Effect } from 'effect';

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
		Effect.withLogSpan('syncTabActionPopup'),
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
		Effect.withLogSpan('syncTabById'),
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
		Effect.withLogSpan('syncAllTabsActionPopup'),
	);
}

export function runToggleMascotOnTabEffect(
	tabId: number,
): Effect.Effect<void, never, ContentCommandsTag> {
	return Effect.flatMap(ContentCommandsTag, (commands) =>
		commands.toggleMascot(tabId),
	).pipe(Effect.withLogSpan('runToggleMascotOnTab'));
}

export function runShowMascotOnTabEffect(
	tabId: number,
): Effect.Effect<void, never, ContentCommandsTag> {
	return Effect.flatMap(ContentCommandsTag, (commands) =>
		commands.showMascot(tabId),
	).pipe(Effect.withLogSpan('runShowMascotOnTab'));
}
