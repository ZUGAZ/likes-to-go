export const LIKES_PAGE_BASE_URL = 'https://soundcloud.com';
/** Consecutive passes with 0 new cards before stopping. Higher = more resilient to slow lazy-load. */
export const NO_NEW_TRACKS_PASSES = 2;
/** Maximum number of inline error "Retry" clicks before giving up. */
export const MAX_ERROR_RETRIES = 3;
/** Wait after clicking "Retry" before re-checking the inline error. */
export const ERROR_RETRY_DELAY_MS = 2000;
