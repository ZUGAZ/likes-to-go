export const LIKES_PAGE_BASE_URL = 'https://soundcloud.com';
/** Consecutive passes with 0 new cards before stopping. Higher = more resilient to slow lazy-load. */
export const NO_NEW_TRACKS_PASSES = 20;
/** Wait after each scroll so lazy-loaded track cards can render. */
export const WAIT_FOR_NODES_MS = 1000;
export const MAX_ACTIONS_PER_MINUTE = 120;
