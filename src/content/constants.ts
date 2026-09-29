export const LIKES_PAGE_BASE_URL = 'https://soundcloud.com';
/**
 * Empty passes with the loading indicator still present before stopping.
 * A normal run stops when the indicator disappears. This bound only
 * catches an indicator that never leaves.
 */
export const STUCK_LOADING_INDICATOR_PASSES = 60;
/** Maximum number of inline error "Retry" clicks before giving up. */
export const MAX_ERROR_RETRIES = 3;
/** Wait after clicking "Retry" before re-checking the inline error. */
export const ERROR_RETRY_DELAY_MS = 2000;
