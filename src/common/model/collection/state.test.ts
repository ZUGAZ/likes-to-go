import { Collecting } from '@/common/model/collection/states/collecting';
import { Done } from '@/common/model/collection/states/done';
import { Idle } from '@/common/model/collection/states/idle';
import { Paused } from '@/common/model/collection/states/paused';
import { collectionTabId } from '@/common/model/collection/state';
import { describe, expect, it } from 'vitest';

describe('collectionTabId', () => {
	it('returns the tab id while collecting', () => {
		expect(
			collectionTabId(
				Collecting({
					sourceUrl: 'https://soundcloud.com/you/likes',
					tabId: 9,
					tracks: [],
					skippedTrackCount: 0,
				}),
			),
		).toBe(9);
	});

	it('returns the tab id while paused', () => {
		expect(
			collectionTabId(
				Paused({
					sourceUrl: 'https://soundcloud.com/you/likes',
					tabId: 4,
					tracks: [],
					skippedTrackCount: 0,
				}),
			),
		).toBe(4);
	});

	it('returns undefined when the state has no collection tab', () => {
		expect(collectionTabId(Idle({}))).toBeUndefined();
		expect(
			collectionTabId(
				Done({
					tracks: [],
					skippedTrackCount: 0,
				}),
			),
		).toBeUndefined();
	});
});
