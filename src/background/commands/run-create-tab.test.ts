import { Effect } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runCreateTab } from '@/background/commands/run-create-tab';
import { TabCreated } from '@/common/model/collection/events/tab-created';
import { TabCreateFailed } from '@/common/model/collection/events/tab-create-failed';

declare const chrome: typeof globalThis.chrome;

describe('runCreateTab', () => {
	beforeEach(() => {
		(globalThis as any).chrome = {
			tabs: {
				create: vi.fn(),
				remove: vi.fn(),
			},
		};
	});

	it('succeeds with tabId when chrome.tabs.create returns an id', async () => {
		(chrome.tabs.create as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
			id: 123,
		});

		const exit = await Effect.runPromiseExit(
			runCreateTab('https://example.com'),
		);

		expect(chrome.tabs.create).toHaveBeenCalledWith({
			url: 'https://example.com',
			active: false,
		});
		expect(exit._tag).toBe('Success');
		if (exit._tag === 'Success') {
			expect(exit.value).toEqual(TabCreated({ tabId: 123 }));
		}
	});

	it('fails when chrome.tabs.create rejects', async () => {
		(chrome.tabs.create as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
			new Error('boom'),
		);

		const exit = await Effect.runPromiseExit(
			runCreateTab('https://example.com'),
		);

		expect(exit._tag).toBe('Failure');
		if (exit._tag === 'Failure') {
			const failure = (exit.cause as any).error ?? exit.cause;
			expect(failure).toEqual(
				TabCreateFailed({
					message: 'Could not open the likes page',
					reason: 'boom',
				}),
			);
		}
	});
});
