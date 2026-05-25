import type { Layout } from '@/layout/model/layout';
import type { LayoutCollectionContext } from '@/layout/model/layout-collection-context';
import { badgesSelectorSet } from '@/layout/infrastructure/layouts/badges';
import {
	listSelectorSet,
	readListTracksFromCards,
} from '@/layout/infrastructure/layouts/list';
import { readTracksFromCards } from '@/layout/infrastructure/read-tracks-from-cards';

export function resolveLayoutCollectionContext(
	layout: Exclude<Layout, 'Unknown'>,
): LayoutCollectionContext {
	switch (layout) {
		case 'Badges':
			return {
				layout: 'Badges',
				selectorSet: badgesSelectorSet,
				readTracksFromCards: (cards, baseUrl) =>
					readTracksFromCards(cards, baseUrl, badgesSelectorSet),
			};
		case 'List':
			return {
				layout: 'List',
				selectorSet: listSelectorSet,
				readTracksFromCards: readListTracksFromCards,
			};
	}
}
