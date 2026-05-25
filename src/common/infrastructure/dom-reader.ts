/**
 * Backward-compatible re-exports for layout DOM reader.
 * Callers will migrate to `@/layout` in a follow-up task.
 */

import { badgesSelectorSet } from '@/layout/infrastructure/layouts/badges';
import {
	readTracksFromCards,
	readTracksFromRoot,
} from '@/layout/infrastructure/read-tracks-from-cards';

export type { RawTrack } from '@/layout/model/raw-track';

/**
 * Parse a list of track card elements into raw tracks. Uses badges selectors by default.
 */
export function getTracksFromCards(
	cards: readonly Element[],
	baseUrl: string,
): ReturnType<typeof readTracksFromCards> {
	return readTracksFromCards(cards, baseUrl, badgesSelectorSet);
}

/**
 * Given the track list container root, query track cards and parse each into a raw track.
 * Uses badges selectors by default.
 */
export function getTracksFromRoot(
	root: Element,
	baseUrl: string,
): ReturnType<typeof readTracksFromRoot> {
	return readTracksFromRoot(root, baseUrl, badgesSelectorSet);
}
