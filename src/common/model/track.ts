import { Schema } from 'effect';

/**
 * Track schema derived from DOM reader output.
 * Required: title, artist, url. Optional: artwork_url.
 * Used to validate DOM-reader output and TracksBatch payloads.
 * URL is validated and decoded via Effect's Schema.URL (string → URL).
 */
export const TrackSchema = Schema.Struct({
	title: Schema.String,
	artist: Schema.String,
	url: Schema.URL,
	artwork_url: Schema.optional(Schema.String),
	user_url: Schema.optional(Schema.String),
	genre: Schema.optional(Schema.String),
	tags: Schema.optional(Schema.Array(Schema.String)),
	playback_count: Schema.optional(Schema.Number),
	likes_count: Schema.optional(Schema.Number),
});

export type Track = Schema.Schema.Type<typeof TrackSchema>;
