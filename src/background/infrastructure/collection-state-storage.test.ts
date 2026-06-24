import {
	clearCollectionStateEffect,
	loadCollectionStateEffect,
	persistCollectionStateEffect,
	syncCollectionStateEffect,
} from '@/background/infrastructure/collection-state-storage';
import { Done } from '@/common/model/collection/states/done';
import { Collecting } from '@/common/model/collection/states/collecting';
import { Effect } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const track = {
	title: 'Track A',
	artist: 'Artist A',
	url: new URL('https://soundcloud.com/artist-a/track-a'),
};

describe('collection state storage', () => {
	let storedItems: Record<string, unknown>;
	const setMock = vi.fn<(items: Record<string, unknown>) => Promise<void>>();
	const getMock = vi.fn<(key: string) => Promise<Record<string, unknown>>>();
	const removeMock = vi.fn<(key: string) => Promise<void>>();

	beforeEach(() => {
		storedItems = {};
		setMock.mockReset();
		getMock.mockReset();
		removeMock.mockReset();

		setMock.mockImplementation((items) => {
			storedItems = { ...storedItems, ...items };
			return Promise.resolve();
		});
		getMock.mockImplementation(() => Promise.resolve(storedItems));
		removeMock.mockImplementation((key) => {
			const remaining = Object.fromEntries(
				Object.entries(storedItems).filter(([entryKey]) => entryKey !== key),
			);
			storedItems = remaining;
			return Promise.resolve();
		});

		Object.defineProperty(globalThis, 'chrome', {
			configurable: true,
			writable: true,
			value: {
				storage: {
					session: {
						set: setMock,
						get: getMock,
						remove: removeMock,
					},
				},
			},
		});
	});

	it('persists active state with encoded track URLs and hydrates it back', async () => {
		const state = Collecting({
			sourceUrl: 'https://soundcloud.com/you/likes',
			tabId: 42,
			tracks: [track],
			skippedTrackCount: 1,
		});

		await Effect.runPromise(persistCollectionStateEffect(state));
		const hydrated = await Effect.runPromise(loadCollectionStateEffect());

		expect(storedItems).toEqual({
			ltgCollectionState: {
				status: 'collecting',
				source: 'https://soundcloud.com/you/likes',
				sourceUrl: 'https://soundcloud.com/you/likes',
				tabId: 42,
				tracks: [
					{
						title: 'Track A',
						artist: 'Artist A',
						url: 'https://soundcloud.com/artist-a/track-a',
					},
				],
				skippedTrackCount: 1,
			},
		});
		expect(hydrated).toEqual(state);
	});

	it('clears storage for terminal states', async () => {
		await Effect.runPromise(
			persistCollectionStateEffect(
				Collecting({
					sourceUrl: 'https://soundcloud.com/you/likes',
					tabId: 42,
					tracks: [track],
					skippedTrackCount: 0,
				}),
			),
		);

		await Effect.runPromise(
			syncCollectionStateEffect(
				Done({
					tracks: [track],
					skippedTrackCount: 0,
				}),
			),
		);

		expect(removeMock).toHaveBeenCalledWith('ltgCollectionState');
		expect(await Effect.runPromise(loadCollectionStateEffect())).toBeNull();
	});

	it('clearCollectionStateEffect removes the session key', async () => {
		storedItems = { ltgCollectionState: { status: 'collecting' } };

		await Effect.runPromise(clearCollectionStateEffect());

		expect(storedItems).toEqual({});
	});
});
