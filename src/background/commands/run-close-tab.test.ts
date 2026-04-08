import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runCloseTab } from '@/background/commands/run-close-tab';
import { runPromiseExitWithSilentLogger } from '@/test/effect-log-test';

describe('runCloseTab', () => {
	const removeMock = vi.fn<(tabId: number) => Promise<void>>();

	beforeEach(() => {
		removeMock.mockReset();
		removeMock.mockResolvedValue(undefined);

		Object.defineProperty(globalThis, 'chrome', {
			configurable: true,
			writable: true,
			value: {
				tabs: {
					remove: removeMock,
				},
			},
		});
	});

	it('calls chrome.tabs.remove and succeeds', async () => {
		const exit = await runPromiseExitWithSilentLogger(runCloseTab(123));

		expect(removeMock).toHaveBeenCalledWith(123);
		expect(exit._tag).toBe('Success');
		if (exit._tag === 'Success') {
			expect(exit.value).toBeUndefined();
		}
	});
});
