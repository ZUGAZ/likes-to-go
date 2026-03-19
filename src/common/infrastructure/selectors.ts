/**
 * Single place for SoundCloud DOM targets (you/likes page).
 * When the host site changes markup, only this file changes.
 * Covers badges-view fields used by v1 collection: list/card, title, artist, link, artwork.
 * Aligned with collection grid: playableTile/audibleTile.
 */

/** CSS selector for the track list container (root for dom-reader). */
export const TRACK_LIST_CONTAINER = '.lazyLoadingList__list';

/** CSS selector for a single track card within the list (li per track). */
export const TRACK_CARD = '.badgeList__item';

/** Selector for track title (relative to card). */
export const TRACK_TITLE = '.playableTile__mainHeading';

/** Selector for artist/username (relative to card). */
export const TRACK_ARTIST = '.playableTile__usernameHeading';

/** Selector for track link (relative to card); artwork link points to track page. */
export const TRACK_LINK = '.audibleTile__artworkLink';

/** Selector for artwork image element (relative to card); URL is in inline style background-image. */
export const TRACK_ARTWORK = '.playableTile__artwork .sc-artwork.image__full';

/**
 * Selector for track cards from 0-based index onward (for incremental collection).
 * Uses :nth-child(n+K) so the DOM returns only cards at index >= fromIndex. Assumes cards are direct children of the list root.
 */
export function trackCardsFromIndex(fromIndex: number): string {
	const k = fromIndex + 1;
	return `${TRACK_CARD}:nth-child(n+${String(k)})`;
}

export const selectors = {
	trackListContainer: TRACK_LIST_CONTAINER,
	trackCard: TRACK_CARD,
	trackCardsFromIndex,
	trackTitle: TRACK_TITLE,
	trackArtist: TRACK_ARTIST,
	trackLink: TRACK_LINK,
	trackArtwork: TRACK_ARTWORK,
} as const;
