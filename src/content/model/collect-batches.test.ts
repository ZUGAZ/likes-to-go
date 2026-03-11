import {
	collectBatch,
	initialScanState,
	type CollectionScanState,
} from '@/content/model/collect-batches';
import { describe, expect, it } from 'vitest';

const baseUrl = 'https://soundcloud.com';

function createListRoot(innerHTML: string): Element {
	const root = document.createElement('div');
	root.className = 'lazyLoadingList__list';
	root.innerHTML = innerHTML;
	return root;
}

/** Single card fixture with valid structure for decoding to Track (absolute URL). */
const singleCardHtml = `
	<li class="badgeList__item">
		<div class="audibleTile">
			<a class="audibleTile__artworkLink" href="https://soundcloud.com/artist-one/track-a"></a>
			<a class="playableTile__mainHeading">Track A</a>
			<a class="playableTile__usernameHeading">Artist One</a>
		</div>
		<span class="playbackTimeline__duration">2:30</span>
	</li>
`;

/** Two cards so we can test incremental batch (first batch both, then no new). */
const twoCardsHtml = `
	<li class="badgeList__item">
		<div class="audibleTile">
			<a class="audibleTile__artworkLink" href="https://soundcloud.com/artist-one/track-a"></a>
			<a class="playableTile__mainHeading">Track A</a>
			<a class="playableTile__usernameHeading">Artist One</a>
		</div>
		<span class="playbackTimeline__duration">2:30</span>
	</li>
	<li class="badgeList__item">
		<div class="audibleTile">
			<a class="audibleTile__artworkLink" href="https://soundcloud.com/artist-two/track-b"></a>
			<a class="playableTile__mainHeading">Track B</a>
			<a class="playableTile__usernameHeading">Artist Two</a>
		</div>
		<span class="playbackTimeline__duration">1:00</span>
	</li>
`;

describe('initialScanState', () => {
	it('returns state with previousCount 0 and totalRawLength 0', () => {
		const state = initialScanState();
		expect(state.previousCount).toBe(0);
		expect(state.totalRawLength).toBe(0);
	});
});

describe('collectBatch', () => {
	it('returns no new cards and unchanged totalCardCount when root has no cards', () => {
		const root = createListRoot('<p>empty</p>');
		const state = initialScanState();
		const { batch, nextState } = collectBatch(root, baseUrl, state);

		expect(batch.tracks).toHaveLength(0);
		expect(batch.rawLength).toBe(0);
		expect(batch.totalCardCount).toBe(0);
		expect(batch.noNewCards).toBe(true);
		expect(nextState.previousCount).toBe(0);
		expect(nextState.totalRawLength).toBe(0);
	});

	it('returns first batch with all parsed tracks and correct state update', () => {
		const root = createListRoot(twoCardsHtml);
		const state = initialScanState();
		const { batch, nextState } = collectBatch(root, baseUrl, state);

		expect(batch.tracks).toHaveLength(2);
		expect(batch.rawLength).toBe(2);
		expect(batch.totalCardCount).toBe(2);
		expect(batch.noNewCards).toBe(false);
		expect(batch.tracks[0]?.title).toBe('Track A');
		expect(batch.tracks[0]?.url.toString()).toBe(
			'https://soundcloud.com/artist-one/track-a',
		);
		expect(batch.tracks[1]?.title).toBe('Track B');

		expect(nextState.previousCount).toBe(2);
		expect(nextState.totalRawLength).toBe(2);
	});

	it('second pass with same state returns no new cards and idempotent counts', () => {
		const root = createListRoot(twoCardsHtml);
		const state: CollectionScanState = {
			previousCount: 2,
			totalRawLength: 2,
			batchIndex: 0,
		};
		const { batch, nextState } = collectBatch(root, baseUrl, state);

		expect(batch.tracks).toHaveLength(0);
		expect(batch.rawLength).toBe(0);
		expect(batch.totalCardCount).toBe(2);
		expect(batch.noNewCards).toBe(true);
		expect(nextState.previousCount).toBe(2);
		expect(nextState.totalRawLength).toBe(2);
	});

	it('single card: first pass returns one track, second pass returns no new cards', () => {
		const root = createListRoot(singleCardHtml);
		const state0 = initialScanState();
		const { batch: batch1, nextState: state1 } = collectBatch(
			root,
			baseUrl,
			state0,
		);

		expect(batch1.tracks).toHaveLength(1);
		expect(batch1.totalCardCount).toBe(1);
		expect(batch1.noNewCards).toBe(false);

		const { batch: batch2, nextState: state2 } = collectBatch(
			root,
			baseUrl,
			state1,
		);
		expect(batch2.tracks).toHaveLength(0);
		expect(batch2.totalCardCount).toBe(1);
		expect(batch2.noNewCards).toBe(true);
		expect(state2.previousCount).toBe(1);
		expect(state2.totalRawLength).toBe(1);
	});
});
