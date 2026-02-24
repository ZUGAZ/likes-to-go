import {
	TRACK_ARTIST,
	TRACK_ARTWORK,
	TRACK_CARD,
	TRACK_DURATION,
	TRACK_LINK,
	TRACK_STATS,
	TRACK_TITLE,
} from '@/common/infrastructure/selectors';

/**
 * Raw track shape from DOM (before schema validation).
 * Required: title, artist, url, duration_ms. Optional fields omitted when missing or malformed.
 * url is string; exporter/schema will validate and resolve relative URLs.
 */
export interface RawTrack {
	readonly title: string;
	readonly artist: string;
	readonly url: string;
	readonly duration_ms: number;
	readonly artwork_url?: string;
	readonly playback_count?: number;
	readonly likes_count?: number;
}

/**
 * Parse duration text (e.g. "3:45", "1:23:45") to milliseconds.
 * Returns 0 if unparseable.
 */
export function parseDurationToMs(text: string): number {
	const trimmed = text.trim();
	if (trimmed.length === 0) return 0;
	const parts = trimmed.split(':').map((p) => parseInt(p, 10));
	if (parts.some(Number.isNaN)) return 0;
	const p0 = parts[0];
	if (parts.length === 1 && p0 !== undefined) return Math.max(0, p0) * 1000;
	const p1 = parts[1];
	if (parts.length === 2 && p0 !== undefined && p1 !== undefined)
		return Math.max(0, p0 * 60 + p1) * 1000;
	const p2 = parts[2];
	if (parts.length >= 3 && p0 !== undefined)
		return Math.max(0, p0 * 3600 + (parts[1] ?? 0) * 60 + (p2 ?? 0)) * 1000;
	return 0;
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

/** Parse "1.2K", "12,500", "1M" style strings to number. Returns undefined if not parseable. */
function parseStatNumber(text: string): number | undefined {
	const normalized = text.replace(/,/g, '').trim().toUpperCase();
	const numMatch = /^(\d+(?:\.\d+)?)\s*([KMB])?$/.exec(normalized);
	const first = numMatch?.[1];
	if (numMatch == null || first == null) return undefined;
	const n = parseFloat(first);
	if (Number.isNaN(n)) return undefined;
	const suffix = numMatch[2];
	if (suffix === 'K') return Math.round(n * 1000);
	if (suffix === 'M') return Math.round(n * 1_000_000);
	if (suffix === 'B') return Math.round(n * 1_000_000_000);
	return Math.round(n);
}

/** Extract playback_count and likes_count from .soundStats text. Order: first number = playback, second = likes. */
function getStats(card: Element): {
	playback_count?: number;
	likes_count?: number;
} {
	const el = card.querySelector(TRACK_STATS);
	if (el == null) return {};
	const text = getText(el);
	// Match numbers with optional K/M and optional decimals (e.g. "12.5K plays" "890 likes")
	const parts = text.split(/\s+/);
	const numbers: number[] = [];
	for (const p of parts) {
		const n = parseStatNumber(p);
		if (n !== undefined) numbers.push(n);
	}
	const playback_count = numbers[0];
	const likes_count = numbers[1];
	return {
		...(playback_count !== undefined && { playback_count }),
		...(likes_count !== undefined && { likes_count }),
	};
}

/**
 * Given the track list container root, query track cards and parse each into a raw track.
 * Uses selectors only. baseUrl is used to resolve relative hrefs (e.g. https://soundcloud.com).
 * Missing or malformed optional fields are omitted; one bad card does not stop collection.
 */
export function getTracksFromRoot(root: Element, baseUrl: string): RawTrack[] {
	const cards = root.querySelectorAll(TRACK_CARD);
	const out: RawTrack[] = [];
	for (const card of cards) {
		const title = getText(card.querySelector(TRACK_TITLE));
		const artist = getText(card.querySelector(TRACK_ARTIST));
		const url = getHref(card, baseUrl);
		const durationEl = card.querySelector(TRACK_DURATION);
		const duration_ms = parseDurationToMs(getText(durationEl));
		if (title === '' || url === '') continue;

		const artwork_url = getArtworkUrl(card);
		const { playback_count, likes_count } = getStats(card);

		out.push({
			title,
			artist,
			url,
			duration_ms,
			...(artwork_url !== undefined && { artwork_url }),
			...(playback_count !== undefined && { playback_count }),
			...(likes_count !== undefined && { likes_count }),
		});
	}
	return out;
}
