import { beforeEach, describe, expect, layer } from '@effect/vitest';
import { Effect } from 'effect';
import { vi } from 'vitest';
import {
	syncAllTabsActionPopupEffect,
	syncTabActionPopupEffect,
	syncTabByIdEffect,
} from '@/background/action-popup-controller';
import { ACTION_DEFAULT_POPUP_PATH } from '@/background/action-popup-path';
import { makeCapturingLogger } from '@/test/effect-log-test';

describe('action-popup-controller', () => {
	type SetPopup = (
		details: chrome.action.PopupDetails,
		callback?: () => void,
	) => void;
	type GetTab = (tabId: number) => Promise<chrome.tabs.Tab>;
	type QueryTabs = (
		queryInfo: chrome.tabs.QueryInfo,
	) => Promise<chrome.tabs.Tab[]>;

	const setPopupMock = vi.fn<SetPopup>();
	const getTabMock = vi.fn<GetTab>();
	const queryTabsMock = vi.fn<QueryTabs>();

	const soundCloudTab: chrome.tabs.Tab = {
		active: true,
		autoDiscardable: true,
		discarded: false,
		frozen: false,
		groupId: -1,
		highlighted: true,
		id: 7,
		incognito: false,
		index: 0,
		pinned: false,
		selected: true,
		url: 'https://soundcloud.com/you/likes',
		windowId: 1,
	};

	const otherTab: chrome.tabs.Tab = {
		...soundCloudTab,
		id: 8,
		url: 'https://example.com',
	};

	beforeEach(() => {
		vi.resetAllMocks();
		setPopupMock.mockImplementation((_details, callback) => {
			callback?.();
		});
		getTabMock.mockResolvedValue(soundCloudTab);
		queryTabsMock.mockResolvedValue([soundCloudTab, otherTab]);

		Object.defineProperty(globalThis, 'chrome', {
			configurable: true,
			writable: true,
			value: {
				action: {
					setPopup: setPopupMock,
				},
				runtime: {
					lastError: undefined,
				},
				tabs: {
					get: getTabMock,
					query: queryTabsMock,
				},
			},
		});
	});

	describe('syncTabActionPopupEffect', () => {
		layer(makeCapturingLogger().layer)((it) => {
			it.effect('sets empty popup for SoundCloud tabs', () =>
				Effect.gen(function* () {
					yield* syncTabActionPopupEffect(7, 'https://soundcloud.com/likes');

					expect(setPopupMock).toHaveBeenCalledWith(
						{ tabId: 7, popup: '' },
						expect.any(Function),
					);
				}),
			);

			it.effect('sets default popup for non-SoundCloud tabs', () =>
				Effect.gen(function* () {
					yield* syncTabActionPopupEffect(8, 'https://example.com');

					expect(setPopupMock).toHaveBeenCalledWith(
						{ tabId: 8, popup: ACTION_DEFAULT_POPUP_PATH },
						expect.any(Function),
					);
				}),
			);
		});
	});

	describe('syncTabByIdEffect', () => {
		layer(makeCapturingLogger().layer)((it) => {
			it.effect('reads tab url and syncs popup path', () =>
				Effect.gen(function* () {
					yield* syncTabByIdEffect(7);

					expect(getTabMock).toHaveBeenCalledWith(7);
					expect(setPopupMock).toHaveBeenCalledWith(
						{ tabId: 7, popup: '' },
						expect.any(Function),
					);
				}),
			);
		});
	});

	describe('syncAllTabsActionPopupEffect', () => {
		layer(makeCapturingLogger().layer)((it) => {
			it.effect('sweeps all tabs from tabs.query', () =>
				Effect.gen(function* () {
					yield* syncAllTabsActionPopupEffect();

					expect(queryTabsMock).toHaveBeenCalledWith({});
					expect(setPopupMock).toHaveBeenCalledWith(
						{ tabId: 7, popup: '' },
						expect.any(Function),
					);
					expect(setPopupMock).toHaveBeenCalledWith(
						{ tabId: 8, popup: ACTION_DEFAULT_POPUP_PATH },
						expect.any(Function),
					);
				}),
			);
		});
	});
});
