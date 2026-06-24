import { loadFixtureText } from '@/common/tests/fixture-loaders';
import {
	collectBatch,
	initialScanState,
	type CollectionScanState,
} from '@/content/model/collect-batches';
import { resolveLayoutCollectionContext, TRACK_LIST_CONTAINER } from '@/layout';
import { describe, expect, it } from 'vitest';

const baseUrl = 'https://soundcloud.com';
const badgesLayoutContext = resolveLayoutCollectionContext('Badges');
const listLayoutContext = resolveLayoutCollectionContext('List');

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

/** Artwork container required for scan overlay (`applyScannedOverlay`); optional for track decode. */
const artworkBlock = `
		<div class="playableTile__artwork">
			<div class="sc-artwork image__full"></div>
		</div>
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

/** Same as twoCardsHtml but includes artwork containers for overlay assertions. */
const twoCardsWithArtworkHtml = `
	<li class="badgeList__item">
		<div class="audibleTile">
			<a class="audibleTile__artworkLink" href="https://soundcloud.com/artist-one/track-a"></a>
			${artworkBlock}
			<a class="playableTile__mainHeading">Track A</a>
			<a class="playableTile__usernameHeading">Artist One</a>
		</div>
		<span class="playbackTimeline__duration">2:30</span>
	</li>
	<li class="badgeList__item">
		<div class="audibleTile">
			<a class="audibleTile__artworkLink" href="https://soundcloud.com/artist-two/track-b"></a>
			${artworkBlock}
			<a class="playableTile__mainHeading">Track B</a>
			<a class="playableTile__usernameHeading">Artist Two</a>
		</div>
		<span class="playbackTimeline__duration">1:00</span>
	</li>
`;

describe('initialScanState', () => {
	it('returns state with zero counts', () => {
		const state = initialScanState();
		expect(state.previousValidCount).toBe(0);
		expect(state.totalParsedCount).toBe(0);
		expect(state.totalSkippedCount).toBe(0);
	});
});

describe('collectBatch', () => {
	it('returns no new cards and unchanged totals when root has no cards', async () => {
		const root = createListRoot('<p>empty</p>');
		const state = initialScanState();
		const { batch, nextState } = await collectBatch(
			root,
			baseUrl,
			state,
			badgesLayoutContext,
		);

		expect(batch.tracks).toHaveLength(0);
		expect(batch.parsedCount).toBe(0);
		expect(batch.skippedCount).toBe(0);
		expect(batch.totalValidCount).toBe(0);
		expect(batch.noNewCards).toBe(true);
		expect(nextState.previousValidCount).toBe(0);
		expect(nextState.totalParsedCount).toBe(0);
		expect(nextState.totalSkippedCount).toBe(0);
	});

	it('returns first batch with all parsed tracks and correct state update', async () => {
		const root = createListRoot(twoCardsHtml);
		const state = initialScanState();
		const { batch, nextState } = await collectBatch(
			root,
			baseUrl,
			state,
			badgesLayoutContext,
		);

		expect(batch.tracks).toHaveLength(2);
		expect(batch.parsedCount).toBe(2);
		expect(batch.skippedCount).toBe(0);
		expect(batch.totalValidCount).toBe(2);
		expect(batch.noNewCards).toBe(false);
		expect(batch.tracks[0]?.title).toBe('Track A');
		expect(batch.tracks[0]?.url.toString()).toBe(
			'https://soundcloud.com/artist-one/track-a',
		);
		expect(batch.tracks[1]?.title).toBe('Track B');

		expect(nextState.previousValidCount).toBe(2);
		expect(nextState.totalParsedCount).toBe(2);
		expect(nextState.totalSkippedCount).toBe(0);
	});

	it('second pass with same state returns no new cards and idempotent counts', async () => {
		const root = createListRoot(twoCardsHtml);
		const state: CollectionScanState = {
			previousValidCount: 2,
			totalParsedCount: 2,
			totalSkippedCount: 0,
		};
		const { batch, nextState } = await collectBatch(
			root,
			baseUrl,
			state,
			badgesLayoutContext,
		);

		expect(batch.tracks).toHaveLength(0);
		expect(batch.parsedCount).toBe(0);
		expect(batch.skippedCount).toBe(0);
		expect(batch.totalValidCount).toBe(2);
		expect(batch.noNewCards).toBe(true);
		expect(nextState.previousValidCount).toBe(2);
		expect(nextState.totalParsedCount).toBe(2);
		expect(nextState.totalSkippedCount).toBe(0);
	});

	it('single card: first pass returns one track, second pass returns no new cards', async () => {
		const root = createListRoot(singleCardHtml);
		const state0 = initialScanState();
		const { batch: batch1, nextState: state1 } = await collectBatch(
			root,
			baseUrl,
			state0,
			badgesLayoutContext,
		);

		expect(batch1.tracks).toHaveLength(1);
		expect(batch1.parsedCount).toBe(1);
		expect(batch1.skippedCount).toBe(0);
		expect(batch1.totalValidCount).toBe(1);
		expect(batch1.noNewCards).toBe(false);

		const { batch: batch2, nextState: state2 } = await collectBatch(
			root,
			baseUrl,
			state1,
			badgesLayoutContext,
		);
		expect(batch2.tracks).toHaveLength(0);
		expect(batch2.parsedCount).toBe(0);
		expect(batch2.skippedCount).toBe(0);
		expect(batch2.totalValidCount).toBe(1);
		expect(batch2.noNewCards).toBe(true);
		expect(state2.previousValidCount).toBe(1);
		expect(state2.totalParsedCount).toBe(1);
		expect(state2.totalSkippedCount).toBe(0);
	});

	it('applies a single heart overlay per scanned card and does not duplicate on rescan', async () => {
		const root = createListRoot(twoCardsWithArtworkHtml);
		const state0 = initialScanState();
		const { nextState: state1 } = await collectBatch(
			root,
			baseUrl,
			state0,
			badgesLayoutContext,
		);

		const artworks = root.querySelectorAll('.playableTile__artwork');
		expect(artworks).toHaveLength(2);
		for (const el of Array.from(artworks)) {
			expect(el.hasAttribute('data-ltg-scanned')).toBe(true);
			const overlays = Array.from(el.children).filter(
				(ch) => ch.textContent === '❤',
			);
			expect(overlays).toHaveLength(1);
		}

		await collectBatch(root, baseUrl, state1, badgesLayoutContext);

		for (const el of Array.from(
			root.querySelectorAll('.playableTile__artwork'),
		)) {
			const overlays = Array.from(el.children).filter(
				(ch) => ch.textContent === '❤',
			);
			expect(overlays).toHaveLength(1);
		}
	});

	it('returns decoded tracks from list-view fixture via List layout context', async () => {
		document.body.innerHTML = loadFixtureText('list-view.html');
		const root = document.querySelector(TRACK_LIST_CONTAINER);
		if (root == null) throw new Error('fixture root missing');

		const { batch } = await collectBatch(
			root,
			baseUrl,
			initialScanState(),
			listLayoutContext,
		);

		expect(batch.tracks).toHaveLength(3);
		expect(batch.tracks[0]?.title).toBe('Arax & Enif - Round');
		expect(batch.tracks[0]?.genre).toBe('Drum & Bass');
		expect(batch.tracks[0]?.playback_count).toBe(27565);
	});

	it('does not add debug-style outlines on list items (overlay only)', async () => {
		const root = createListRoot(twoCardsWithArtworkHtml);
		await collectBatch(root, baseUrl, initialScanState(), badgesLayoutContext);
		for (const li of Array.from(root.querySelectorAll('li.badgeList__item'))) {
			const o = li.getAttribute('style') ?? '';
			expect(o).not.toContain('outline');
			expect(o).not.toContain('border');
		}
	});
});
