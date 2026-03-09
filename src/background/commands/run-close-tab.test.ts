import { Effect } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runCloseTab } from '@/background/commands/run-close-tab';

declare const chrome: typeof globalThis.chrome;

describe('runCloseTab', () => {
	beforeEach(() => {
		(globalThis as any).chrome = {
			tabs: {
				remove: vi.fn(),
			},
		};
	});

	it('calls chrome.tabs.remove and succeeds', async () => {
		const exit = await Effect.runPromiseExit(runCloseTab(123));

		expect(chrome.tabs.remove).toHaveBeenCalledWith(123);
		expect(exit._tag).toBe('Success');
		if (exit._tag === 'Success') {
			expect(exit.value).toBeUndefined();
		}
	});
});
