import { Schema } from 'effect';

export const RawTrackSchema = Schema.Struct({
	title: Schema.String,
	artist: Schema.String,
	url: Schema.String,
	artwork_url: Schema.optional(Schema.String),
	user_url: Schema.optional(Schema.String),
	genre: Schema.optional(Schema.String),
	tags: Schema.optional(Schema.Array(Schema.String)),
	playback_count: Schema.optional(Schema.Number),
	likes_count: Schema.optional(Schema.Number),
});

export type RawTrack = Schema.Schema.Type<typeof RawTrackSchema>;
