/**
 * Single place for SoundCloud DOM targets (you/likes page).
 * When the host site changes markup, only this file changes.
 * MVP: track list container, track card, title, artist, link, duration.
 * Updated for current likes page: ul.lazyLoadingList__list, li.badgeList__item, playableTile/audibleTile classes.
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

/** Selector for duration (relative to card); may be absent on likes grid. */
export const TRACK_DURATION = '.playbackTimeline__duration';

export const selectors = {
	trackListContainer: TRACK_LIST_CONTAINER,
	trackCard: TRACK_CARD,
	trackTitle: TRACK_TITLE,
	trackArtist: TRACK_ARTIST,
	trackLink: TRACK_LINK,
	trackDuration: TRACK_DURATION,
} as const;
