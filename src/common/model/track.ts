import { Schema } from "effect";

/**
 * Minimal track schema for MVP: title, artist, url, duration_ms.
 * Used to validate DOM-reader output and TracksBatch payloads.
 * URL is validated and decoded via Effect's Schema.URL (string → URL).
 */
export const TrackSchema = Schema.Struct({
	title: Schema.String,
	artist: Schema.String,
	url: Schema.URL,
	duration_ms: Schema.Number.pipe(Schema.nonNegative()),
});

export type Track = Schema.Schema.Type<typeof TrackSchema>;
