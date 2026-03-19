import { describe, expect, it } from 'vitest';
import {
	TRACK_ARTIST,
	TRACK_ARTWORK,
	TRACK_CARD,
	TRACK_LINK,
	TRACK_LIST_CONTAINER,
	TRACK_TITLE,
	selectors,
	trackCardsFromIndex,
} from '@/common/infrastructure/selectors';
import { loadFixtureText } from '@/common/tests/fixture-loaders';

describe('selectors', () => {
	it('export string selectors for badges view fields (list, card, title, artist, link, artwork)', () => {
		expect(typeof TRACK_LIST_CONTAINER).toBe('string');
		expect(TRACK_LIST_CONTAINER.length).toBeGreaterThan(0);
		expect(typeof TRACK_CARD).toBe('string');
		expect(typeof TRACK_TITLE).toBe('string');
		expect(typeof TRACK_ARTIST).toBe('string');
		expect(typeof TRACK_LINK).toBe('string');
		expect(typeof TRACK_ARTWORK).toBe('string');
	});

	it('selectors object matches constants', () => {
		expect(selectors.trackListContainer).toBe(TRACK_LIST_CONTAINER);
		expect(selectors.trackCard).toBe(TRACK_CARD);
		expect(selectors.trackTitle).toBe(TRACK_TITLE);
		expect(selectors.trackArtist).toBe(TRACK_ARTIST);
		expect(selectors.trackLink).toBe(TRACK_LINK);
		expect(selectors.trackArtwork).toBe(TRACK_ARTWORK);
	});
});

function loadBadgesViewFixture(): Element {
	const html = loadFixtureText('badges-view.html');
	document.body.innerHTML = html;

	const root = document.querySelector(TRACK_LIST_CONTAINER);
	if (root == null) {
		throw new Error(
			`Fixture root not found for selector ${TRACK_LIST_CONTAINER}`,
		);
	}

	return root;
}

describe('selectors fixture coverage', () => {
	it('matches expected counts and attribute/style values', () => {
		const root = loadBadgesViewFixture();

		const cards = Array.from(root.querySelectorAll(TRACK_CARD));
		expect(cards).toHaveLength(5);

		// Title/artist are present only for well-formed track cards.
		expect(root.querySelectorAll(TRACK_TITLE)).toHaveLength(3);
		expect(root.querySelectorAll(TRACK_ARTIST)).toHaveLength(3);

		// Artwork link exists on valid cards and the malformed card; loader placeholder has none.
		expect(root.querySelectorAll(TRACK_LINK)).toHaveLength(4);
		expect(root.querySelectorAll(TRACK_ARTWORK)).toHaveLength(4);

		// Validate the first well-formed card’s href and artwork style.
		const firstCard = cards[0] ?? null;
		if (firstCard == null) {
			throw new Error('Expected at least one track card in fixture');
		}

		const firstHref = firstCard.querySelector(TRACK_LINK)?.getAttribute('href');
		expect(firstHref).toBe('/datatransmissiondnb/nkz-run-away-rollout-records');

		const firstArtworkStyle =
			firstCard.querySelector(TRACK_ARTWORK)?.getAttribute('style') ?? '';
		expect(firstArtworkStyle).toContain(
			'https://i1.sndcdn.com/artworks-QPhQzEwsqobVlxam-cyaOVg-t500x500.png',
		);

		// Malformed card: it has a (blank) href but is missing title and username selectors.
		const malformedCard = cards.find((card) => {
			return card.querySelector(TRACK_LINK)?.getAttribute('href') === '';
		});
		if (malformedCard == null) {
			throw new Error('Expected malformed card with empty href');
		}

		const malformedHref = malformedCard
			.querySelector(TRACK_LINK)
			?.getAttribute('href');
		expect(malformedHref).toBe('');
		expect(malformedCard.querySelector(TRACK_TITLE)).toBeNull();
		expect(malformedCard.querySelector(TRACK_ARTIST)).toBeNull();

		const malformedArtworkStyle =
			malformedCard.querySelector(TRACK_ARTWORK)?.getAttribute('style') ?? '';
		expect(malformedArtworkStyle).not.toContain('background-image');

		// `trackCardsFromIndex(fromIndex)` uses 0-based index and nth-child(n+K).
		expect(root.querySelectorAll(trackCardsFromIndex(0))).toHaveLength(5);
		expect(root.querySelectorAll(trackCardsFromIndex(1))).toHaveLength(4);
		expect(root.querySelectorAll(trackCardsFromIndex(3))).toHaveLength(2);
	});
});
