/**
 * Single place for SoundCloud DOM targets (you/likes page).
 * When the host site changes markup, only this file changes.
 * MVP: track list container, track card, title, artist, link, duration.
 */

/** CSS selector for the track list container (root for dom-reader). */
export const TRACK_LIST_CONTAINER = ".lazyLoadingList__list";

/** CSS selector for a single track card within the list. */
export const TRACK_CARD = ".soundList__item";

/** Selector for track title (relative to card). */
export const TRACK_TITLE = ".soundTitle__title";

/** Selector for artist/username (relative to card). */
export const TRACK_ARTIST = ".soundTitle__username";

/** Selector for track link (relative to card). */
export const TRACK_LINK = "a[href]";

/** Selector for duration (relative to card). */
export const TRACK_DURATION = ".playbackTimeline__duration";

export const selectors = {
	trackListContainer: TRACK_LIST_CONTAINER,
	trackCard: TRACK_CARD,
	trackTitle: TRACK_TITLE,
	trackArtist: TRACK_ARTIST,
	trackLink: TRACK_LINK,
	trackDuration: TRACK_DURATION,
} as const;
