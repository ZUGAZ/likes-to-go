import { runSelectCollectionTab } from '@/background/commands/run-select-collection-tab';
import { CollectionTabSelected } from '@/common/model/collection/events/collection-tab-selected';
import { TabCreateFailed } from '@/common/model/collection/events/tab-create-failed';
import { runPromiseExitWithSilentLogger } from '@/test/effect-log-test';
import { Cause, Exit, Option } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';

declare const chrome: typeof globalThis.chrome;

describe('runSelectCollectionTab', () => {
	type TestTab = {
		readonly id?: number;
		readonly url?: string;
		readonly status?: string;
	};
	type QueryTabs = (queryInfo: chrome.tabs.QueryInfo) => Promise<TestTab[]>;
	type CreateTab = (
		createProperties: chrome.tabs.CreateProperties,
	) => Promise<TestTab>;

	const queryTabsMock = vi.fn<QueryTabs>();
	const createTabMock = vi.fn<CreateTab>();

	beforeEach(() => {
		queryTabsMock.mockReset();
		createTabMock.mockReset();

		Object.defineProperty(globalThis, 'chrome', {
			configurable: true,
			writable: true,
			value: {
				tabs: {
					query: queryTabsMock,
					create: createTabMock,
				},
			},
		});
	});

	it('selects the active SoundCloud tab when it is loaded', async () => {
		queryTabsMock.mockResolvedValueOnce([
			{
				id: 123,
				url: 'https://soundcloud.com/artist/track',
				status: 'complete',
			},
		]);

		const exit = await runPromiseExitWithSilentLogger(runSelectCollectionTab());

		expect(chrome.tabs.query).toHaveBeenCalledWith({
			active: true,
			currentWindow: true,
		});
		expect(chrome.tabs.create).not.toHaveBeenCalled();
		expect(exit._tag).toBe('Success');
		if (exit._tag === 'Success') {
			expect(exit.value).toEqual(
				CollectionTabSelected({
					tabId: 123,
					shouldStartImmediately: true,
				}),
			);
		}
	});

	it('selects the active SoundCloud tab without requiring a likes URL', async () => {
		queryTabsMock.mockResolvedValueOnce([
			{
				id: 123,
				url: 'https://soundcloud.com/artist/track',
				status: 'loading',
			},
		]);

		const exit = await runPromiseExitWithSilentLogger(runSelectCollectionTab());

		expect(chrome.tabs.create).not.toHaveBeenCalled();
		expect(exit._tag).toBe('Success');
		if (exit._tag === 'Success') {
			expect(exit.value).toEqual(
				CollectionTabSelected({
					tabId: 123,
					shouldStartImmediately: false,
				}),
			);
		}
	});

	it('opens the own likes page when the active tab is not SoundCloud', async () => {
		queryTabsMock.mockResolvedValueOnce([
			{
				id: 123,
				url: 'https://example.com',
				status: 'complete',
			},
		]);
		createTabMock.mockResolvedValueOnce({
			id: 456,
			url: 'https://soundcloud.com/you/likes',
			status: 'loading',
		});

		const exit = await runPromiseExitWithSilentLogger(runSelectCollectionTab());

		expect(chrome.tabs.create).toHaveBeenCalledWith({
			url: 'https://soundcloud.com/you/likes',
			active: true,
		});
		expect(exit._tag).toBe('Success');
		if (exit._tag === 'Success') {
			expect(exit.value).toEqual(
				CollectionTabSelected({
					tabId: 456,
					shouldStartImmediately: false,
				}),
			);
		}
	});

	it('fails when the selected tab has no id', async () => {
		queryTabsMock.mockResolvedValueOnce([
			{
				url: 'https://soundcloud.com/artist/track',
				status: 'complete',
			},
		]);

		const exit = await runPromiseExitWithSilentLogger(runSelectCollectionTab());

		expect(Exit.isFailure(exit)).toBe(true);
		if (!Exit.isFailure(exit)) return;

		const failure = exit.cause.pipe(Cause.failureOption, Option.getOrUndefined);
		expect(failure).toEqual(
			TabCreateFailed({
				message: 'Could not select the collection tab',
				reason: 'Selected tab did not have an id',
			}),
		);
	});
});
