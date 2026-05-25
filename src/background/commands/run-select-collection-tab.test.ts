import { beforeEach, describe, expect, layer, vi } from '@effect/vitest';
import { Cause, Effect, Exit, Option } from 'effect';
import { runSelectCollectionTab } from '@/background/commands/run-select-collection-tab';
import { CollectionTabSelected } from '@/common/model/collection/events/collection-tab-selected';
import { TabCreateFailed } from '@/common/model/collection/events/tab-create-failed';
import { silentLoggerLayer } from '@/test/effect-log-test';

declare const chrome: typeof globalThis.chrome;

describe('runSelectCollectionTab', () => {
	type TestTab = {
		readonly id?: number;
		readonly pendingUrl?: string;
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

	layer(silentLoggerLayer)((it) => {
		it.effect('selects the active SoundCloud tab', () =>
			Effect.gen(function* () {
				queryTabsMock.mockResolvedValueOnce([
					{
						id: 123,
						url: 'https://soundcloud.com/artist/track',
					},
				]);

				const exit = yield* Effect.exit(runSelectCollectionTab());

				expect(chrome.tabs.query).toHaveBeenCalledWith({
					active: true,
					currentWindow: true,
				});
				expect(chrome.tabs.create).not.toHaveBeenCalled();
				expect(exit._tag).toBe('Success');
				if (exit._tag === 'Success') {
					expect(exit.value).toEqual(
						CollectionTabSelected({
							sourceUrl: 'https://soundcloud.com/artist/track',
							tabId: 123,
						}),
					);
				}
			}),
		);

		it.effect(
			'selects the active SoundCloud tab without checking tab load status',
			() =>
				Effect.gen(function* () {
					queryTabsMock.mockResolvedValueOnce([
						{
							id: 123,
							url: 'https://soundcloud.com/artist/track',
							status: 'loading',
						},
					]);

					const exit = yield* Effect.exit(runSelectCollectionTab());

					expect(chrome.tabs.create).not.toHaveBeenCalled();
					expect(exit._tag).toBe('Success');
					if (exit._tag === 'Success') {
						expect(exit.value).toEqual(
							CollectionTabSelected({
								sourceUrl: 'https://soundcloud.com/artist/track',
								tabId: 123,
							}),
						);
					}
				}),
		);

		it.effect(
			'opens the own likes page when the active tab is not SoundCloud',
			() =>
				Effect.gen(function* () {
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

					const exit = yield* Effect.exit(runSelectCollectionTab());

					expect(chrome.tabs.create).toHaveBeenCalledWith({
						url: 'https://soundcloud.com/you/likes',
						active: true,
					});
					expect(exit._tag).toBe('Success');
					if (exit._tag === 'Success') {
						expect(exit.value).toEqual(
							CollectionTabSelected({
								sourceUrl: 'https://soundcloud.com/you/likes',
								tabId: 456,
							}),
						);
					}
				}),
		);

		it.effect(
			'uses pendingUrl when the created tab url is not available yet',
			() =>
				Effect.gen(function* () {
					queryTabsMock.mockResolvedValueOnce([
						{
							id: 123,
							url: 'https://example.com',
							status: 'complete',
						},
					]);
					createTabMock.mockResolvedValueOnce({
						id: 456,
						pendingUrl: 'https://soundcloud.com/you/likes',
						status: 'loading',
					});

					const exit = yield* Effect.exit(runSelectCollectionTab());

					expect(exit._tag).toBe('Success');
					if (exit._tag === 'Success') {
						expect(exit.value).toEqual(
							CollectionTabSelected({
								sourceUrl: 'https://soundcloud.com/you/likes',
								tabId: 456,
							}),
						);
					}
				}),
		);

		it.effect('fails when the selected tab has no id', () =>
			Effect.gen(function* () {
				queryTabsMock.mockResolvedValueOnce([
					{
						url: 'https://soundcloud.com/artist/track',
						status: 'complete',
					},
				]);

				const exit = yield* Effect.exit(runSelectCollectionTab());

				expect(Exit.isFailure(exit)).toBe(true);
				if (!Exit.isFailure(exit)) return;

				const failure = exit.cause.pipe(
					Cause.failureOption,
					Option.getOrUndefined,
				);
				expect(failure).toEqual(
					TabCreateFailed({
						message: 'Could not select the collection tab',
						reason: 'Selected tab did not have an id',
					}),
				);
			}),
		);

		it.effect('fails when the selected tab has no SoundCloud URL', () =>
			Effect.gen(function* () {
				queryTabsMock.mockResolvedValueOnce([
					{
						id: 123,
						url: 'https://example.com',
						status: 'complete',
					},
				]);
				createTabMock.mockResolvedValueOnce({
					id: 456,
					status: 'loading',
				});

				const exit = yield* Effect.exit(runSelectCollectionTab());

				expect(Exit.isFailure(exit)).toBe(true);
				if (!Exit.isFailure(exit)) return;

				const failure = exit.cause.pipe(
					Cause.failureOption,
					Option.getOrUndefined,
				);
				expect(failure).toEqual(
					TabCreateFailed({
						message: 'Could not select the collection tab',
						reason: 'Selected tab did not have a SoundCloud URL',
					}),
				);
			}),
		);
	});
});
