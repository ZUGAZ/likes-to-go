import { decodeTracksFromRaw } from '@/common/infrastructure/decode-tracks-from-raw';
import { getTracksFromCards } from '@/common/infrastructure/dom-reader';
import { trackCardsFromIndex } from '@/common/infrastructure/selectors';
import type { Track } from '@/common/model/track';

export interface CollectionBatch {
	readonly tracks: readonly Track[];
	readonly parsedCount: number;
	readonly skippedCount: number;
	readonly totalValidCount: number;
	readonly noNewCards: boolean;
}

/** State carried between single-pass scans; used by the collection loop, not by this module's public API. */
export interface CollectionScanState {
	readonly previousValidCount: number;
	readonly totalParsedCount: number;
	readonly totalSkippedCount: number;
	readonly batchIndex: number;
}

const INITIAL_SCAN_STATE: CollectionScanState = {
	previousValidCount: 0,
	totalParsedCount: 0,
	totalSkippedCount: 0,
	batchIndex: 0,
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
	const selector = trackCardsFromIndex(state.previousValidCount);
	const cards = root.querySelectorAll(selector);
	const debugColors = ['red', 'blue', 'green', 'lime', 'magenta'];
	const color = debugColors[state.batchIndex % debugColors.length];
	cards.forEach((card) => {
		if (card instanceof HTMLElement) {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			card.style.border = `2px solid ${color}`;
		}
	});
	const raw = getTracksFromCards(Array.from(cards), baseUrl);
	const tracks = decodeTracksFromRaw(raw);

	const parsedCount = raw.length;
	const skippedCount = parsedCount - tracks.length;
	// Counts only schema-validated tracks, not raw DOM elements.
	// Placeholder cards (lazy-loaded, empty title/url) are filtered by
	// getTracksFromCards and will activate on later scroll passes.
	const totalValidCount = state.previousValidCount + tracks.length;
	const noNewCards = tracks.length === 0;

	const batch: CollectionBatch = {
		tracks,
		parsedCount,
		skippedCount,
		totalValidCount,
		noNewCards,
	};
	const nextState: CollectionScanState = {
		previousValidCount: totalValidCount,
		totalParsedCount: state.totalParsedCount + parsedCount,
		totalSkippedCount: state.totalSkippedCount + skippedCount,
		batchIndex: state.batchIndex + 1,
	};
	return { batch, nextState };
}
