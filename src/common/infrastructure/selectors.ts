/**
 * Backward-compatible re-exports for layout selectors.
 * Callers will migrate to `@/layout` in a follow-up task.
 */

import { badgesSelectorSet } from '@/layout/infrastructure/layouts/badges';
import {
	trackArtist,
	trackArtwork,
	trackArtworkContainer,
	trackCard,
	trackLink,
	trackTitle,
} from '@/layout/infrastructure/layouts/badges/selectors';
import {
	ERROR_INDICATOR,
	isErrorIndicatorPresent,
	isLoadingIndicatorPresent,
	isUserLoggedIn,
	LOADING_INDICATOR,
	RETRY_BUTTON,
	TRACK_LIST_CONTAINER,
	USER_NAV,
} from '@/layout/infrastructure/selectors/shared';

export {
	ERROR_INDICATOR,
	isErrorIndicatorPresent,
	isLoadingIndicatorPresent,
	isUserLoggedIn,
	LOADING_INDICATOR,
	RETRY_BUTTON,
	TRACK_LIST_CONTAINER,
	USER_NAV,
};

/** CSS selector for a single track card within the list (li per track). */
export const TRACK_CARD = trackCard;

/** Selector for track title (relative to card). */
export const TRACK_TITLE = trackTitle;

/** Selector for artist/username (relative to card). */
export const TRACK_ARTIST = trackArtist;

/** Selector for track link (relative to card); artwork link points to track page. */
export const TRACK_LINK = trackLink;

/** Selector for artwork image element (relative to card); URL is in inline style background-image. */
export const TRACK_ARTWORK = trackArtwork;

/** Selector for artwork container (relative to card); used for overlay positioning. */
export const TRACK_ARTWORK_CONTAINER = trackArtworkContainer;

/**
 * Selector for track cards from 0-based index onward (for incremental collection).
 * Uses :nth-child(n+K) so the DOM returns only cards at index >= fromIndex. Assumes cards are direct children of the list root.
 */
export function trackCardsFromIndex(fromIndex: number): string {
	return badgesSelectorSet.trackCardsFromIndex(fromIndex);
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
