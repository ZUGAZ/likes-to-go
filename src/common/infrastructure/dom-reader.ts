import {
	TRACK_ARTIST,
	TRACK_ARTWORK,
	TRACK_CARD,
	TRACK_LINK,
	TRACK_TITLE,
} from '@/common/infrastructure/selectors';

/**
 * Raw track shape from DOM (before schema validation).
 * Required: title, artist, url. Optional fields omitted when missing.
 * url is string; exporter/schema will validate and resolve relative URLs.
 */
export interface RawTrack {
	readonly title: string;
	readonly artist: string;
	readonly url: string;
	readonly artwork_url?: string;
}

/**
 * Resolve href to absolute URL. If baseUrl is given, resolve relative paths against it.
 */
function resolveUrl(href: string, baseUrl: string): string {
	if (href.startsWith('http://') || href.startsWith('https://')) return href;
	try {
		return new URL(href, baseUrl).href;
	} catch {
		return href;
	}
}

function getText(el: Element | null): string {
	return (el?.textContent ?? '').trim();
}

function getHref(card: Element, baseUrl: string): string {
	const a = card.querySelector(TRACK_LINK);
	const href = a?.getAttribute('href');
	if (href == null || href === '') return '';
	return resolveUrl(href, baseUrl);
}

/** Extract artwork URL from element's background-image style. Returns undefined if missing or unparseable. */
function getArtworkUrl(card: Element): string | undefined {
	const el = card.querySelector(TRACK_ARTWORK);
	if (el == null) return undefined;
	const style = el.getAttribute('style') ?? '';
	const match = /url\s*\(\s*["']?([^"')]+)["']?\s*\)/.exec(style);
	const raw = match?.[1];
	if (raw == null) return undefined;
	const url = raw.replace(/&quot;/g, '"').trim();
	return url.length > 0 ? url : undefined;
}

/**
 * Parse a list of track card elements into raw tracks. Uses selectors only; baseUrl resolves relative hrefs.
 * Optional fields are omitted when missing; one bad card does not stop collection.
 */
export function getTracksFromCards(
	cards: readonly Element[],
	baseUrl: string,
): RawTrack[] {
	const out: RawTrack[] = [];
	for (const card of cards) {
		const title = getText(card.querySelector(TRACK_TITLE));
		const artist = getText(card.querySelector(TRACK_ARTIST));
		const url = getHref(card, baseUrl);
		if (title === '' || url === '') continue;

		const artwork_url = getArtworkUrl(card);

		out.push({
			title,
			artist,
			url,
			...(artwork_url !== undefined && { artwork_url }),
		});
	}
	return out;
}

/**
 * Given the track list container root, query track cards and parse each into a raw track.
 * Uses selectors only. baseUrl is used to resolve relative hrefs (e.g. https://soundcloud.com).
 * Optional fields are omitted when missing; one bad card does not stop collection.
 */
export function getTracksFromRoot(root: Element, baseUrl: string): RawTrack[] {
	const cards = root.querySelectorAll(TRACK_CARD);
	return getTracksFromCards(Array.from(cards), baseUrl);
}
