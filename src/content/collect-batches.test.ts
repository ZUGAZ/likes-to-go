import { describe, expect, it } from 'vitest';
import { collectBatches } from '@/content/collect-batches';

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

describe('collectBatches', () => {
	it('yields no batches when root has no cards and noNewTracksPasses is 1', () => {
		const root = createListRoot('<p>empty</p>');
		const gen = collectBatches(root, baseUrl, 1);
		const batches = [...gen];
		// First iteration: 0 cards, noNewCards true, passes=1, then return without yielding
		expect(batches).toHaveLength(0);
	});

	it('yields first batch with all parsed tracks then stops after noNewTracksPasses with no new cards', () => {
		const root = createListRoot(twoCardsHtml);
		const noNewTracksPasses = 2;
		const gen = collectBatches(root, baseUrl, noNewTracksPasses);
		const batches = [...gen];

		expect(batches).toHaveLength(2);

		// First batch: both cards (selector :nth-child(n+1) returns both)
		expect(batches[0].tracks).toHaveLength(2);
		expect(batches[0].rawLength).toBe(2);
		expect(batches[0].totalCardCount).toBe(2);
		expect(batches[0].noNewCards).toBe(false);
		expect(batches[0].tracks[0]?.title).toBe('Track A');
		expect(batches[0].tracks[0]?.url.toString()).toBe(
			'https://soundcloud.com/artist-one/track-a',
		);
		expect(batches[0].tracks[1]?.title).toBe('Track B');

		// Second batch: no new cards (selector :nth-child(n+3) returns none)
		expect(batches[1].tracks).toHaveLength(0);
		expect(batches[1].rawLength).toBe(0);
		expect(batches[1].totalCardCount).toBe(2);
		expect(batches[1].noNewCards).toBe(true);

		// Generator then exits (no third yield) after noNewTracksPasses consecutive no-new passes
	});

	it('yields one batch when one card and noNewTracksPasses is 1 then exits without yielding no-new batch', () => {
		const root = createListRoot(singleCardHtml);
		const gen = collectBatches(root, baseUrl, 1);
		const batches = [...gen];

		expect(batches).toHaveLength(1);
		expect(batches[0].tracks).toHaveLength(1);
		expect(batches[0].totalCardCount).toBe(1);
		expect(batches[0].noNewCards).toBe(false);
		// Next iteration would have 0 new cards, passes=1, generator returns without yielding
	});

	it('yields one batch with new cards then noNewTracksPasses-1 batches with no new cards then exits', () => {
		const root = createListRoot(singleCardHtml);
		const gen = collectBatches(root, baseUrl, 3);
		const batches = [...gen];
		// Batch 1: 1 track (noNewCards false). Batch 2: no new (pass 1). Batch 3: no new (pass 2). Then pass 3 -> return without yielding.
		expect(batches).toHaveLength(3);
		expect(batches[0].noNewCards).toBe(false);
		expect(batches[0].tracks).toHaveLength(1);
		expect(batches[1].noNewCards).toBe(true);
		expect(batches[2].noNewCards).toBe(true);
	});
});
