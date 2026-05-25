import { beforeEach, describe, expect, layer, vi } from '@effect/vitest';
import { Cause, Effect, Exit, Option } from 'effect';
import { runCreateTab } from '@/background/commands/run-create-tab';
import { TabCreated } from '@/common/model/collection/events/tab-created';
import { TabCreateFailed } from '@/common/model/collection/events/tab-create-failed';
import { silentLoggerLayer } from '@/test/effect-log-test';

declare const chrome: typeof globalThis.chrome;

describe('runCreateTab', () => {
	type CreateTab = (
		createProperties: chrome.tabs.CreateProperties,
	) => Promise<{ id?: number }>;
	type RemoveTab = (tabId: number) => Promise<void>;

	const createTabMock = vi.fn<CreateTab>();
	const removeTabMock = vi.fn<RemoveTab>();

	beforeEach(() => {
		createTabMock.mockReset();
		removeTabMock.mockReset();

		Object.defineProperty(globalThis, 'chrome', {
			configurable: true,
			writable: true,
			value: {
				tabs: {
					create: createTabMock,
					remove: removeTabMock,
				},
			},
		});
	});

	layer(silentLoggerLayer)((it) => {
		it.effect('succeeds with tabId when chrome.tabs.create returns an id', () =>
			Effect.gen(function* () {
				createTabMock.mockResolvedValueOnce({
					id: 123,
				});

				const exit = yield* Effect.exit(runCreateTab('https://example.com'));

				expect(chrome.tabs.create).toHaveBeenCalledWith({
					url: 'https://example.com',
					active: true,
				});
				expect(exit._tag).toBe('Success');
				if (exit._tag === 'Success') {
					expect(exit.value).toEqual(TabCreated({ tabId: 123 }));
				}
			}),
		);

		it.effect('fails when chrome.tabs.create rejects', () =>
			Effect.gen(function* () {
				createTabMock.mockRejectedValueOnce(new Error('boom'));

				const exit = yield* Effect.exit(runCreateTab('https://example.com'));

				expect(Exit.isFailure(exit)).toBe(true);
				if (!Exit.isFailure(exit)) return;

				const failure = exit.cause.pipe(
					Cause.failureOption,
					Option.getOrUndefined,
				);

				expect(failure).toEqual(
					TabCreateFailed({
						message: 'Could not open the likes page',
						reason: 'boom',
					}),
				);
			}),
		);
	});
});
