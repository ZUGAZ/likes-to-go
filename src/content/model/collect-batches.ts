import { decodeTracksFromRaw } from '@/common/infrastructure/decode-tracks-from-raw';
import { getTracksFromCards } from '@/common/infrastructure/dom-reader';
import {
	TRACK_ARTWORK_CONTAINER,
	trackCardsFromIndex,
} from '@/common/infrastructure/selectors';
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
}

const INITIAL_SCAN_STATE: CollectionScanState = {
	previousValidCount: 0,
	totalParsedCount: 0,
	totalSkippedCount: 0,
};

/** Data attribute used to mark artwork containers that have been scanned. */
const LTG_SCANNED_ATTR = 'data-ltg-scanned';

/**
 * Apply a semi-transparent heart overlay to the artwork container of a scanned card.
 * Idempotent: does not create duplicate overlays if called multiple times on the same card.
 */
function applyScannedOverlay(card: Element): void {
	const artwork = card.querySelector(TRACK_ARTWORK_CONTAINER);
	if (!(artwork instanceof HTMLElement)) return;
	if (artwork.hasAttribute(LTG_SCANNED_ATTR)) return;

	artwork.setAttribute(LTG_SCANNED_ATTR, '');
	artwork.style.position = 'relative';

	const overlay = document.createElement('div');
	overlay.textContent = '❤';
	overlay.style.cssText = [
		'position:absolute',
		'inset:0',
		'display:flex',
		'align-items:center',
		'justify-content:center',
		'font-size:10rem',
		'background:rgba(0,0,0,0.35)',
		'pointer-events:none',
		'z-index:10',
	].join(';');

	artwork.appendChild(overlay);
}

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
	cards.forEach((card) => {
		applyScannedOverlay(card);
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
	};
	return { batch, nextState };
}
