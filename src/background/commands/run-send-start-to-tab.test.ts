import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runSendStartToTab } from '@/background/commands/run-send-start-to-tab';
import { sendToTab } from '@/common/infrastructure/chrome-messaging';
import { StartCollectionRequest } from '@/common/model/request-message';
import { runPromiseExitWithSilentLogger } from '@/test/effect-log-test';

vi.mock('@/common/infrastructure/chrome-messaging', () => ({
	sendToTab: vi.fn().mockResolvedValue(undefined),
}));

describe('runSendStartToTab', () => {
	type UpdateTab = (
		tabId: number,
		updateProperties: chrome.tabs.UpdateProperties,
	) => Promise<chrome.tabs.Tab>;
	type UpdateWindow = (
		windowId: number,
		updateInfo: chrome.windows.UpdateInfo,
	) => Promise<chrome.windows.Window>;

	const updateTabMock = vi.fn<UpdateTab>();
	const updateWindowMock = vi.fn<UpdateWindow>();
	const sendToTabMock = vi.mocked(sendToTab);
	const focusedCollectionTab: chrome.tabs.Tab = {
		active: true,
		autoDiscardable: true,
		discarded: false,
		frozen: false,
		groupId: -1,
		highlighted: true,
		id: 42,
		incognito: false,
		index: 0,
		pinned: false,
		selected: true,
		windowId: 7,
	};
	const focusedWindow: chrome.windows.Window = {
		alwaysOnTop: false,
		focused: true,
		id: 7,
		incognito: false,
	};

	beforeEach(() => {
		vi.resetAllMocks();
		updateTabMock.mockResolvedValue(focusedCollectionTab);
		updateWindowMock.mockResolvedValue(focusedWindow);

		Object.defineProperty(globalThis, 'chrome', {
			configurable: true,
			writable: true,
			value: {
				tabs: {
					update: updateTabMock,
				},
				windows: {
					update: updateWindowMock,
				},
			},
		});
	});

	it('focuses the collection tab before sending start', async () => {
		const exit = await runPromiseExitWithSilentLogger(runSendStartToTab(42));

		expect(chrome.tabs.update).toHaveBeenCalledWith(42, { active: true });
		expect(chrome.windows.update).toHaveBeenCalledWith(7, { focused: true });
		expect(sendToTabMock).toHaveBeenCalledWith(42, StartCollectionRequest());
		expect(exit._tag).toBe('Success');
		if (exit._tag === 'Success') {
			expect(exit.value).toBeUndefined();
		}
	});
});
