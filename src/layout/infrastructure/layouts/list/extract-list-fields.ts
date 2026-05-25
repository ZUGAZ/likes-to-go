import { listFieldSelectors } from '@/layout/infrastructure/layouts/list/selectors';
import {
	parseCommaFormattedInteger,
	parsePlaysCount,
} from '@/layout/infrastructure/layouts/list/parse-formatted-count';
import type { RawTrack } from '@/layout/model/raw-track';

type ListFields = Pick<
	RawTrack,
	'genre' | 'tags' | 'playback_count' | 'likes_count'
>;

/** Extract list-only metadata from a track card; omits keys when values are missing or unparseable. */
export function extractListFields(card: Element): Partial<ListFields> {
	const tagText = (
		card.querySelector(listFieldSelectors.trackTagContent)?.textContent ?? ''
	).trim();
	const playback_count = parsePlaysCount(card);
	const likeLabelText =
		card.querySelector(listFieldSelectors.trackLikeLabel)?.textContent ?? '';
	const likes_count = parseCommaFormattedInteger(likeLabelText);

	return {
		...(tagText !== '' && { genre: tagText, tags: [tagText] }),
		...(playback_count !== undefined && { playback_count }),
		...(likes_count !== undefined && { likes_count }),
	};
}
