import {
	TRACK_ARTIST,
	TRACK_CARD,
	TRACK_DURATION,
	TRACK_LINK,
	TRACK_TITLE,
} from "@/common/infrastructure/selectors";

/**
 * Raw track shape from DOM (before schema validation).
 * url is string; exporter/schema will validate and resolve relative URLs.
 */
export interface RawTrack {
	readonly title: string;
	readonly artist: string;
	readonly url: string;
	readonly duration_ms: number;
}

/**
 * Parse duration text (e.g. "3:45", "1:23:45") to milliseconds.
 * Returns 0 if unparseable.
 */
export function parseDurationToMs(text: string): number {
	const trimmed = text.trim();
	if (trimmed.length === 0) return 0;
	const parts = trimmed.split(":").map((p) => parseInt(p, 10));
	if (parts.some(Number.isNaN)) return 0;
	const p0 = parts[0];
	if (parts.length === 1 && p0 !== undefined) return Math.max(0, p0) * 1000;
	const p1 = parts[1];
	if (parts.length === 2 && p0 !== undefined && p1 !== undefined)
		return Math.max(0, p0 * 60 + p1) * 1000;
	const p2 = parts[2];
	if (parts.length >= 3 && p0 !== undefined)
		return (
			Math.max(
				0,
				p0 * 3600 + (parts[1] ?? 0) * 60 + (p2 ?? 0),
			) * 1000
		);
	return 0;
}

/**
 * Resolve href to absolute URL. If baseUrl is given, resolve relative paths against it.
 */
function resolveUrl(href: string, baseUrl: string): string {
	if (href.startsWith("http://") || href.startsWith("https://"))
		return href;
	try {
		return new URL(href, baseUrl).href;
	} catch {
		return href;
	}
}

function getText(el: Element | null): string {
	return (el?.textContent ?? "").trim();
}

function getHref(el: Element | null, baseUrl: string): string {
	const a = el?.querySelector(TRACK_LINK);
	const href = a?.getAttribute("href");
	if (href == null || href === "") return "";
	return resolveUrl(href, baseUrl);
}

/**
 * Given the track list container root, query track cards and parse each into a raw track.
 * Uses selectors only. baseUrl is used to resolve relative hrefs (e.g. https://soundcloud.com).
 */
export function getTracksFromRoot(
	root: Element,
	baseUrl: string,
): RawTrack[] {
	const cards = root.querySelectorAll(TRACK_CARD);
	const out: RawTrack[] = [];
	for (const card of cards) {
		const title = getText(card.querySelector(TRACK_TITLE));
		const artist = getText(card.querySelector(TRACK_ARTIST));
		const url = getHref(card, baseUrl);
		const durationEl = card.querySelector(TRACK_DURATION);
		const durationText = getText(durationEl);
		const duration_ms = parseDurationToMs(durationText);
		if (title !== "" && url !== "") {
			out.push({
				title,
				artist,
				url,
				duration_ms,
			});
		}
	}
	return out;
}
