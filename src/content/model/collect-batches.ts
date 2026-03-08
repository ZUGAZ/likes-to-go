import { decodeTracksFromRaw } from '@/common/infrastructure/decode-tracks-from-raw';
import { getTracksFromCards } from '@/common/infrastructure/dom-reader';
import { trackCardsFromIndex } from '@/common/infrastructure/selectors';
import type { Track } from '@/common/model/track';

export interface CollectionBatch {
	readonly tracks: readonly Track[];
	readonly rawLength: number;
	readonly totalCardCount: number;
	readonly noNewCards: boolean;
}

/** State carried between single-pass scans; used by the collection loop, not by this module's public API. */
export interface CollectionScanState {
	readonly previousCount: number;
	readonly totalRawLength: number;
}

const INITIAL_SCAN_STATE: CollectionScanState = {
	previousCount: 0,
	totalRawLength: 0,
};

/** Initial state for the first call to collectBatch. */
export function initialScanState(): CollectionScanState {
	return INITIAL_SCAN_STATE;
}

/**
 * Single-pass scan: reads only new cards (via :nth-child selector), parses, decodes.
 * Pure: no I/O, no loop, no knowledge of passes or termination. Consumer drives repeated calls and pacing.
 */
export function collectBatch(
	root: Element,
	baseUrl: string,
	state: CollectionScanState,
): { batch: CollectionBatch; nextState: CollectionScanState } {
	const selector = trackCardsFromIndex(state.previousCount);
	const cards = root.querySelectorAll(selector);
	const raw = getTracksFromCards(Array.from(cards), baseUrl);
	const tracks = decodeTracksFromRaw(raw);
	const totalCardCount = state.previousCount + cards.length;
	const noNewCards = cards.length === 0;
	const totalRawLength = state.totalRawLength + raw.length;

	const batch: CollectionBatch = {
		tracks,
		rawLength: totalRawLength,
		totalCardCount,
		noNewCards,
	};
	const nextState: CollectionScanState = {
		previousCount: totalCardCount,
		totalRawLength,
	};
	return { batch, nextState };
}
