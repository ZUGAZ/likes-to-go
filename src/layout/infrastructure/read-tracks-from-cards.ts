import type { RawTrack } from '@/layout/model/raw-track';
import type { LayoutSelectorSet } from '@/layout/model/selector-set';

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

function getHref(card: Element, baseUrl: string, trackLink: string): string {
	const a = card.querySelector(trackLink);
	const href = a?.getAttribute('href');
	if (href == null || href === '') return '';
	return resolveUrl(href, baseUrl);
}

function getUserUrl(
	card: Element,
	baseUrl: string,
	trackArtist: string,
): string | undefined {
	const a = card.querySelector(trackArtist);
	const href = a?.getAttribute('href');
	if (href == null) return undefined;
	const trimmed = href.trim();
	if (trimmed === '') return undefined;
	const resolved = resolveUrl(trimmed, baseUrl);
	return resolved.trim() === '' ? undefined : resolved;
}

/** Extract artwork URL from element's background-image style. Returns undefined if missing or unparseable. */
function getArtworkUrl(
	card: Element,
	trackArtwork: string,
): string | undefined {
	const el = card.querySelector(trackArtwork);
	if (el == null) return undefined;
	const style = el.getAttribute('style') ?? '';
	const match = /url\s*\(\s*["']?([^"')]+)["']?\s*\)/.exec(style);
	const raw = match?.[1];
	if (raw == null) return undefined;
	const url = raw.replace(/&quot;/g, '"').trim();
	return url.length > 0 ? url : undefined;
}

/**
 * Parse a list of track card elements into raw tracks. Uses selectorSet only; baseUrl resolves relative hrefs.
 * Optional fields are omitted when missing; one bad card does not stop collection.
 */
export function readTracksFromCards(
	cards: readonly Element[],
	baseUrl: string,
	selectorSet: LayoutSelectorSet,
): RawTrack[] {
	const out: RawTrack[] = [];
	for (const card of cards) {
		const title = getText(card.querySelector(selectorSet.trackTitle));
		const artist = getText(card.querySelector(selectorSet.trackArtist));
		const url = getHref(card, baseUrl, selectorSet.trackLink);
		if (title === '' || url === '') continue;

		const user_url = getUserUrl(card, baseUrl, selectorSet.trackArtist);
		const artwork_url = getArtworkUrl(card, selectorSet.trackArtwork);

		out.push({
			title,
			artist,
			url,
			...(user_url !== undefined && { user_url }),
			...(artwork_url !== undefined && { artwork_url }),
		});
	}
	return out;
}

/**
 * Given the track list container root, query track cards and parse each into a raw track.
 * Uses selectorSet only. baseUrl is used to resolve relative hrefs (e.g. https://soundcloud.com).
 * Optional fields are omitted when missing; one bad card does not stop collection.
 */
export function readTracksFromRoot(
	root: Element,
	baseUrl: string,
	selectorSet: LayoutSelectorSet,
): RawTrack[] {
	const cards = root.querySelectorAll(selectorSet.trackCard);
	return readTracksFromCards(Array.from(cards), baseUrl, selectorSet);
}
