import type { Track } from "@/common/model/track";

/** JSON-serializable track shape (url as string). */
export interface ExportTrack {
	readonly title: string;
	readonly artist: string;
	readonly url: string;
	readonly duration_ms: number;
}

export interface ExportInput {
	readonly tracks: readonly Track[];
	readonly exported_at?: Date | string;
	readonly source_url?: string;
}

export interface ExportPayload {
	readonly format_version: 1;
	readonly exported_at: string;
	readonly source_url: string;
	readonly track_count: number;
	readonly tracks: readonly ExportTrack[];
}

const DEFAULT_SOURCE_URL = "https://soundcloud.com/you/likes";

function trackToExportTrack(t: Track): ExportTrack {
	return {
		title: t.title,
		artist: t.artist,
		url: t.url.toString(),
		duration_ms: t.duration_ms,
	};
}

/**
 * Build the export payload for format_version 1.
 * exported_at defaults to now (ISO); source_url defaults to SoundCloud likes URL.
 */
export function buildExportPayload(input: ExportInput): ExportPayload {
	const exportedAt =
		typeof input.exported_at === "string"
			? input.exported_at
			: (input.exported_at ?? new Date()).toISOString();
	return {
		format_version: 1,
		exported_at: exportedAt,
		source_url: input.source_url ?? DEFAULT_SOURCE_URL,
		track_count: input.tracks.length,
		tracks: input.tracks.map(trackToExportTrack),
	};
}
