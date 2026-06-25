import { beforeEach, describe, expect, layer } from '@effect/vitest';
import { Effect, Fiber, TestClock, TestContext } from 'effect';
import { vi } from 'vitest';
import {
	runToggleMascotOnTabEffect,
	syncAllTabsActionPopupEffect,
	syncTabActionPopupEffect,
	syncTabByIdEffect,
} from '@/background/action-popup-controller';
import { ACTION_DEFAULT_POPUP_PATH } from '@/background/action-popup-path';
import { sendToTabEffect } from '@/common/infrastructure/chrome-messaging';
import { SendToTabMessagingFailed } from '@/common/infrastructure/send-to-tab';
import { ToggleMascotRequest } from '@/common/model/request-message';
import { makeCapturingLogger } from '@/test/effect-log-test';

vi.mock('@/common/infrastructure/chrome-messaging', () => ({
	sendToTabEffect: vi.fn(() => Effect.void),
}));

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
	const sendToTabEffectMock = vi.mocked(sendToTabEffect);

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
		sendToTabEffectMock.mockReturnValue(Effect.void);

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

	describe('runToggleMascotOnTabEffect', () => {
		layer(makeCapturingLogger().layer)((it) => {
			it.effect('sends ToggleMascot to the tab', () =>
				Effect.gen(function* () {
					yield* runToggleMascotOnTabEffect(7);

					expect(sendToTabEffectMock).toHaveBeenCalledWith(
						7,
						ToggleMascotRequest(),
					);
				}),
			);

			it.effect(
				'retries missing receiver failures then logs warning and succeeds',
				() =>
					Effect.gen(function* () {
						const capturingLogger = makeCapturingLogger();
						const missingReceiver = new SendToTabMessagingFailed({
							reason:
								'Could not establish connection. Receiving end does not exist.',
						});

						sendToTabEffectMock
							.mockReturnValueOnce(Effect.fail(missingReceiver))
							.mockReturnValueOnce(Effect.fail(missingReceiver))
							.mockReturnValueOnce(Effect.fail(missingReceiver))
							.mockReturnValueOnce(Effect.fail(missingReceiver));

						const fiber = yield* runToggleMascotOnTabEffect(7).pipe(
							Effect.provide(capturingLogger.layer),
							Effect.fork,
						);
						yield* TestClock.adjust('1400 millis');
						yield* Fiber.join(fiber);

						expect(sendToTabEffectMock).toHaveBeenCalledTimes(4);
						expect(capturingLogger.messages()).toEqual(
							expect.arrayContaining([
								expect.arrayContaining(['ToggleMascot retry']),
								expect.arrayContaining(['ToggleMascot send failed']),
							]),
						);
					}).pipe(Effect.provide(TestContext.TestContext)),
			);
		});
	});
});
