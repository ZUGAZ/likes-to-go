import type { Layout } from '@/layout/model/layout';
import type { LayoutSelectorSet } from '@/layout/model/selector-set';
import type { RawTrack } from '@/layout/model/raw-track';

export interface LayoutCollectionContext {
	readonly layout: Exclude<Layout, 'Unknown'>;
	readonly selectorSet: LayoutSelectorSet;
	readonly readTracksFromCards: (
		cards: readonly Element[],
		baseUrl: string,
	) => RawTrack[];
}
