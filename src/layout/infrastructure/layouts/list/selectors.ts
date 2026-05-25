/** CSS selector for a single track card within the list (li per track). */
export const trackCard = '.soundList__item';

/** Selector for track title (relative to card). */
export const trackTitle = '.soundTitle__title';

/** Selector for artist/username (relative to card). */
export const trackArtist = '.soundTitle__username';

/** Selector for track link (relative to card); cover art link points to track page. */
export const trackLink = '.sound__coverArt';

/** Selector for artwork image element (relative to card); URL is in inline style background-image. */
export const trackArtwork = '.sound__artwork .sc-artwork.image__full';

/** Selector for artwork container (relative to card); used for overlay positioning. */
export const trackArtworkContainer = '.sound__artwork';

/** List-only field selectors (not part of LayoutSelectorSet). */
export const listFieldSelectors = {
	trackTag: '.soundTitle__tag',
	trackTagContent: '.soundTitle__tag .sc-tagContent',
	trackPlaysStat: '.sc-ministats-plays',
	trackPlaysItem: 'li.sc-ministats-item',
	trackLikeLabel: '.sc-button-like .sc-button-label',
} as const;
