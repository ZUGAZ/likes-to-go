import type { Track } from '@/common/model/track';

/** JSON-serializable track shape per v1 schema (url as string; optional fields omitted when absent). */
export interface ExportTrack {
	readonly title: string;
	readonly artist: string;
	readonly url: string;
	readonly artwork_url?: string;
}

export interface ExportInput {
	readonly tracks: readonly Track[];
	readonly exported_at?: Date | string;
	readonly source_url?: string;
	readonly user?: string;
}

/** v1 JSON export root: format_version, exported_at, source_url, user, track_count, tracks. */
export interface ExportPayload {
	readonly format_version: 1;
	readonly exported_at: string;
	readonly source_url: string;
	readonly user: string;
	readonly track_count: number;
	readonly tracks: readonly ExportTrack[];
}

const DEFAULT_SOURCE_URL = 'https://soundcloud.com/you/likes';

function trackToExportTrack(t: Track): ExportTrack {
	return {
		title: t.title,
		artist: t.artist,
		url: t.url.toString(),
		...(t.artwork_url !== undefined && { artwork_url: t.artwork_url }),
	};
}

/**
 * Build the export payload for format_version 1.
 * exported_at defaults to now (ISO); source_url defaults to SoundCloud likes URL; user defaults to ''.
 */
export function buildExportPayload(input: ExportInput): ExportPayload {
	const exportedAt =
		typeof input.exported_at === 'string'
			? input.exported_at
			: (input.exported_at ?? new Date()).toISOString();
	return {
		format_version: 1,
		exported_at: exportedAt,
		source_url: input.source_url ?? DEFAULT_SOURCE_URL,
		user: input.user ?? '',
		track_count: input.tracks.length,
		tracks: input.tracks.map(trackToExportTrack),
	};
}
