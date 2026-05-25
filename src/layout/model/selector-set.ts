import type { Layout } from '@/layout/model/layout';

export interface LayoutSelectorSet {
	readonly layout: Layout;
	readonly trackCard: string;
	readonly trackTitle: string;
	readonly trackArtist: string;
	readonly trackLink: string;
	readonly trackArtwork: string;
	readonly trackArtworkContainer: string;
	readonly trackCardsFromIndex: (fromIndex: number) => string;
}
