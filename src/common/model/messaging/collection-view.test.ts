import {
	Content,
	ExtensionPage,
	Popup,
	type Endpoint,
} from 'browser-extension-kit/messaging';
import { Equal, Schema } from 'effect';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { COLLECTION_STATUSES } from '@/common/model/collection/collection-status';
import { collectionStateToGetStateResponse } from '@/common/model/collection/state-to-response';
import type { CollectionState } from '@/common/model/collection/state';
import { CollectingRequested } from '@/common/model/collection/states/collecting-requested';
import { Collecting } from '@/common/model/collection/states/collecting';
import { Done } from '@/common/model/collection/states/done';
import { ErrorState } from '@/common/model/collection/states/error-state';
import { Idle } from '@/common/model/collection/states/idle';
import { Paused } from '@/common/model/collection/states/paused';
import { Saving } from '@/common/model/collection/states/saving';
import { COLLECTION_VISIBILITY_PAUSED_MESSAGE } from '@/common/model/collection/visibility-paused-message';
import {
	CollectionView,
	collectionStateToView,
} from '@/common/model/messaging/collection-view';

const roundTrip =
	<A, I>(schema: Schema.Schema<A, I>) =>
	(value: A): A => {
		const encoded: unknown = JSON.parse(
			JSON.stringify(Schema.encodeSync(schema)(value)),
		);
		return Schema.decodeUnknownSync(schema)(encoded);
	};

const callers: ReadonlyArray<{
	readonly name: string;
	readonly caller: Endpoint;
	readonly onCollectionTab: boolean;
}> = [
	{ name: 'Popup', caller: new Popup(), onCollectionTab: false },
	{
		name: 'ExtensionPage',
		caller: new ExtensionPage({ tabId: 7 }),
		onCollectionTab: false,
	},
	{
		name: 'Content tab 7',
		caller: new Content({ tabId: 7, frameId: 0 }),
		onCollectionTab: true,
	},
	{
		name: 'Content tab 8',
		caller: new Content({ tabId: 8, frameId: 0 }),
		onCollectionTab: false,
	},
];

const collecting = Collecting({
	sourceUrl: 'https://soundcloud.com/you/likes',
	tabId: 7,
	tracks: [],
	skippedTrackCount: 0,
});

const paused = Paused({
	sourceUrl: 'https://soundcloud.com/you/likes',
	tabId: 7,
	tracks: [],
	skippedTrackCount: 0,
});

const collectingWithSkips = Collecting({
	sourceUrl: 'https://soundcloud.com/you/likes',
	tabId: 7,
	tracks: [],
	skippedTrackCount: 2,
});

const statesWithoutCollectionTab: readonly CollectionState[] = [
	Idle({}),
	CollectingRequested(),
	Done({ tracks: [], skippedTrackCount: 0 }),
	Saving({ tracks: [], skippedTrackCount: 0 }),
	ErrorState({ reason: 'collection-failed', message: 'Could not collect' }),
];

const fixtureStates: readonly CollectionState[] = [
	Idle({}),
	Idle({ source: 'active-soundcloud-tab' }),
	CollectingRequested(),
	collecting,
	collectingWithSkips,
	paused,
	Done({ tracks: [], skippedTrackCount: 0 }),
	Done({ tracks: [], skippedTrackCount: 3 }),
	Saving({ tracks: [], skippedTrackCount: 0 }),
	ErrorState({ reason: 'collection-failed', message: 'Could not collect' }),
];

function viewWithoutCollectionFlag(view: CollectionView) {
	const {
		isCollectionTab,
		status,
		trackCount,
		message,
		skippedTrackCount,
		source,
	} = view;
	expect(typeof isCollectionTab).toBe('boolean');
	return {
		status,
		trackCount,
		...(message !== undefined && { message }),
		...(skippedTrackCount !== undefined && { skippedTrackCount }),
		...(source !== undefined && { source }),
	};
}

const collectionViewArbitrary = fc
	.record({
		status: fc.constantFrom(...COLLECTION_STATUSES),
		trackCount: fc.nat(),
		message: fc.option(fc.string(), { nil: undefined }),
		skippedTrackCount: fc.option(fc.nat(), { nil: undefined }),
		source: fc.option(fc.constantFrom('active-soundcloud-tab', 'likes-page'), {
			nil: undefined,
		}),
		isCollectionTab: fc.boolean(),
	})
	.map(
		({
			message,
			skippedTrackCount,
			source,
			status,
			trackCount,
			isCollectionTab,
		}) =>
			new CollectionView({
				status,
				trackCount,
				isCollectionTab,
				...(message !== undefined && { message }),
				...(skippedTrackCount !== undefined && { skippedTrackCount }),
				...(source !== undefined && { source }),
			}),
	);

describe('collectionStateToView', () => {
	it.each(callers)(
		'Collecting isCollectionTab for $name',
		({ caller, onCollectionTab }) => {
			expect(collectionStateToView(collecting, caller).isCollectionTab).toBe(
				onCollectionTab,
			);
		},
	);

	it.each(callers)(
		'Paused isCollectionTab for $name',
		({ caller, onCollectionTab }) => {
			expect(collectionStateToView(paused, caller).isCollectionTab).toBe(
				onCollectionTab,
			);
		},
	);

	it.each(callers)(
		'isCollectionTab is false for $name outside collecting and paused',
		({ caller }) => {
			for (const state of statesWithoutCollectionTab) {
				expect(collectionStateToView(state, caller).isCollectionTab).toBe(
					false,
				);
			}
		},
	);

	it('matches the state response fields for every fixture and caller', () => {
		for (const state of fixtureStates) {
			for (const { caller } of callers) {
				expect(
					viewWithoutCollectionFlag(collectionStateToView(state, caller)),
				).toEqual(collectionStateToGetStateResponse(state));
			}
		}
	});

	it('keeps an idle source and the paused message, and omits a zero skip count', () => {
		expect(
			collectionStateToView(
				Idle({ source: 'active-soundcloud-tab' }),
				new Popup(),
			).source,
		).toBe('active-soundcloud-tab');
		expect(collectionStateToView(paused, new Popup()).message).toBe(
			COLLECTION_VISIBILITY_PAUSED_MESSAGE,
		);
		expect(
			collectionStateToView(collecting, new Popup()).skippedTrackCount,
		).toBeUndefined();
		expect(
			collectionStateToView(collectingWithSkips, new Popup()).skippedTrackCount,
		).toBe(2);
	});

	it('is equal to itself and unequal when only isCollectionTab differs', () => {
		const contentOnTab = new Content({ tabId: 7, frameId: 0 });
		const contentElsewhere = new Content({ tabId: 8, frameId: 0 });
		expect(
			Equal.equals(
				collectionStateToView(collecting, contentOnTab),
				collectionStateToView(collecting, contentOnTab),
			),
		).toBe(true);
		expect(
			Equal.equals(
				collectionStateToView(collecting, contentOnTab),
				collectionStateToView(collecting, contentElsewhere),
			),
		).toBe(false);
	});
});

describe('CollectionView schema', () => {
	it('round-trips through JSON', () => {
		fc.assert(
			fc.property(collectionViewArbitrary, (view) => {
				expect(Equal.equals(roundTrip(CollectionView)(view), view)).toBe(true);
			}),
		);
	});

	it('rejects an unknown status', () => {
		expect(() =>
			Schema.decodeUnknownSync(CollectionView)({
				status: 'not-a-status',
				trackCount: 0,
				isCollectionTab: false,
			}),
		).toThrow();
	});
});
