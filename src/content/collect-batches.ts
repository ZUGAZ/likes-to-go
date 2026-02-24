import type { Track } from '@/common/model/track';
import { decodeTracksFromRaw } from '@/common/infrastructure/decode-tracks-from-raw';
import { getTracksFromCards } from '@/common/infrastructure/dom-reader';
import { trackCardsFromIndex } from '@/common/infrastructure/selectors';

export interface CollectionBatch {
	readonly tracks: readonly Track[];
	readonly rawLength: number;
	readonly totalCardCount: number;
	readonly noNewCards: boolean;
}

/**
 * Sync generator that yields one batch per iteration: reads only new cards (via :nth-child selector), parses, decodes.
 * No I/O; consumer does send, pacing, scroll, wait. Stops after noNewTracksPasses consecutive passes with no new cards.
 */
export function* collectBatches(
	root: Element,
	baseUrl: string,
	noNewTracksPasses: number,
): Generator<CollectionBatch> {
	let previousCount = 0;
	let passesWithNoNewTracks = 0;

	for (;;) {
		const cards = root.querySelectorAll(trackCardsFromIndex(previousCount));
		const raw = getTracksFromCards(Array.from(cards), baseUrl);
		const tracks = decodeTracksFromRaw(raw);
		const totalCardCount = previousCount + cards.length;
		const noNewCards = cards.length === 0;

		previousCount = totalCardCount;
		if (noNewCards) {
			passesWithNoNewTracks++;
			if (passesWithNoNewTracks >= noNewTracksPasses) return;
		} else {
			passesWithNoNewTracks = 0;
		}

		yield { tracks, rawLength: raw.length, totalCardCount, noNewCards };
	}
}
