import type { LayoutSelectorSet } from '@/layout/model/selector-set';
import {
	trackArtist,
	trackArtwork,
	trackArtworkContainer,
	trackCard,
	trackLink,
	trackTitle,
} from '@/layout/infrastructure/layouts/list/selectors';

/**
 * Selector for track cards from 0-based index onward (for incremental collection).
 * Uses :nth-child(n+K) so the DOM returns only cards at index >= fromIndex. Assumes cards are direct children of the list root.
 */
export function trackCardsFromIndex(fromIndex: number): string {
	const k = fromIndex + 1;
	return `${trackCard}:nth-child(n+${String(k)})`;
}

export const listSelectorSet: LayoutSelectorSet = {
	layout: 'List',
	trackCard,
	trackTitle,
	trackArtist,
	trackLink,
	trackArtwork,
	trackArtworkContainer,
	trackCardsFromIndex,
};

export {
	trackArtist,
	trackArtwork,
	trackArtworkContainer,
	trackCard,
	trackLink,
	trackTitle,
} from '@/layout/infrastructure/layouts/list/selectors';
export { listLayoutDetector } from '@/layout/infrastructure/layouts/list/detect';
