/** CSS selector for the track list container (root for dom-reader). */
export const TRACK_LIST_CONTAINER = '.lazyLoadingList__list';

/** CSS selector for SoundCloud's infinite-scroll loading spinner (end-of-feed sentinel). */
export const LOADING_INDICATOR = '.loading.regular.m-padded';

/** CSS selector for SoundCloud's inline error container shown after the track list. */
export const ERROR_INDICATOR = '.inlineError';

/** CSS selector for the "Retry" anchor inside the inline error container. */
export const RETRY_BUTTON = '.inlineError .sc-button';

/** CSS selector for the user navigation element in the header (present only when logged in). */
export const USER_NAV = '.header__userNav';

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
