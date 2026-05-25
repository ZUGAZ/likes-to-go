import { beforeEach, describe, expect, layer, vi } from '@effect/vitest';
import { Effect } from 'effect';
import { runCloseTab } from '@/background/commands/run-close-tab';
import { silentLoggerLayer } from '@/test/effect-log-test';

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

	layer(silentLoggerLayer)((it) => {
		it.effect('calls chrome.tabs.remove and succeeds', () =>
			Effect.gen(function* () {
				const exit = yield* Effect.exit(runCloseTab(123));

				expect(removeMock).toHaveBeenCalledWith(123);
				expect(exit._tag).toBe('Success');
				if (exit._tag === 'Success') {
					expect(exit.value).toBeUndefined();
				}
			}),
		);
	});
});
