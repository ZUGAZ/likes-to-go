import { describe, expect, it } from 'vitest';
import {
	TRACK_ARTIST,
	TRACK_ARTWORK,
	TRACK_CARD,
	TRACK_LINK,
	TRACK_LIST_CONTAINER,
	TRACK_TITLE,
	selectors,
} from '@/common/infrastructure/selectors';

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
