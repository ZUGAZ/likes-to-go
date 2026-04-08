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

/** Selector for artwork container (relative to card); used for overlay positioning. */
export const TRACK_ARTWORK_CONTAINER = '.playableTile__artwork';

/** CSS selector for SoundCloud's infinite-scroll loading spinner (end-of-feed sentinel). */
export const LOADING_INDICATOR = '.loading.regular.m-padded';

/** CSS selector for SoundCloud's inline error container shown after the track list. */
export const ERROR_INDICATOR = '.inlineError';

/** CSS selector for the "Retry" anchor inside the inline error container. */
export const RETRY_BUTTON = '.inlineError .sc-button';

/** CSS selector for the user navigation element in the header (present only when logged in). */
export const USER_NAV = '.header__userNav';

/**
 * Selector for track cards from 0-based index onward (for incremental collection).
 * Uses :nth-child(n+K) so the DOM returns only cards at index >= fromIndex. Assumes cards are direct children of the list root.
 */
export function trackCardsFromIndex(fromIndex: number): string {
	const k = fromIndex + 1;
	return `${TRACK_CARD}:nth-child(n+${String(k)})`;
}

/**
 * DOM check for the infinite-scroll loading spinner.
 * The selector is a sibling of the track list container, so the query must be done
 * against a parent scope that contains both nodes (e.g. `document`).
 */
export function isLoadingIndicatorPresent(scope: ParentNode): boolean {
	return scope.querySelector(LOADING_INDICATOR) != null;
}

/**
 * DOM check for SoundCloud's inline error container.
 * The error is a sibling of the track list container, so the query must run
 * against a parent scope that contains both nodes (e.g. `document`).
 */
export function isErrorIndicatorPresent(scope: ParentNode): boolean {
	return scope.querySelector(ERROR_INDICATOR) != null;
}

/**
 * DOM check for user login status.
 * The user nav element is only present when a user is logged in to SoundCloud.
 * The selector must be queried against a parent scope that contains the header (e.g. `document`).
 */
export function isUserLoggedIn(scope: ParentNode): boolean {
	return scope.querySelector(USER_NAV) != null;
}

export const selectors = {
	trackListContainer: TRACK_LIST_CONTAINER,
	trackCard: TRACK_CARD,
	trackCardsFromIndex,
	trackTitle: TRACK_TITLE,
	trackArtist: TRACK_ARTIST,
	trackLink: TRACK_LINK,
	trackArtwork: TRACK_ARTWORK,
	trackArtworkContainer: TRACK_ARTWORK_CONTAINER,
	loadingIndicator: LOADING_INDICATOR,
	errorIndicator: ERROR_INDICATOR,
	retryButton: RETRY_BUTTON,
	userNav: USER_NAV,
} as const;
