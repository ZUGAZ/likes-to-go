import { Schema } from 'effect';

export const RawTrackSchema = Schema.Struct({
	title: Schema.String,
	artist: Schema.String,
	url: Schema.String,
	artwork_url: Schema.optional(Schema.String),
	user_url: Schema.optional(Schema.String),
});

export type RawTrack = Schema.Schema.Type<typeof RawTrackSchema>;
