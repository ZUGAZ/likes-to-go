/**
 * Backward-compatible re-exports for layout DOM reader.
 * Callers will migrate to `@/layout` in a follow-up task.
 */

import { badgesSelectorSet } from '@/layout/infrastructure/layouts/badges';
import { readTracksFromCards } from '@/layout/infrastructure/read-tracks-from-cards';

/**
 * Parse a list of track card elements into raw tracks. Uses badges selectors by default.
 */
export function getTracksFromCards(
	cards: readonly Element[],
	baseUrl: string,
): ReturnType<typeof readTracksFromCards> {
	return readTracksFromCards(cards, baseUrl, badgesSelectorSet);
}
