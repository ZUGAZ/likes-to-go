import { extractListFields } from '@/layout/infrastructure/layouts/list/extract-list-fields';
import { listSelectorSet } from '@/layout/infrastructure/layouts/list/list-selector-set';
import { readTracksFromCards } from '@/layout/infrastructure/read-tracks-from-cards';
import type { RawTrack } from '@/layout/model/raw-track';

/** Parse list layout cards into raw tracks with core fields plus list-only metadata. */
export function readListTracksFromCards(
	cards: readonly Element[],
	baseUrl: string,
): RawTrack[] {
	const out: RawTrack[] = [];
	for (const card of cards) {
		const core = readTracksFromCards([card], baseUrl, listSelectorSet)[0];
		if (core === undefined) continue;
		out.push({ ...core, ...extractListFields(card) });
	}
	return out;
}
