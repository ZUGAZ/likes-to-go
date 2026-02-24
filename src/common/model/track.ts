import { Either, Schema } from 'effect';
import { InvalidTrack } from '@/common/model/errors';

/**
 * Full track schema for v1 JSON output: required title, artist, url, duration_ms;
 * optional genre, tags, artwork_url, liked_at, playback_count, likes_count.
 * Used to validate DOM-reader output and TracksBatch payloads.
 * URL is validated and decoded via Effect's Schema.URL (string → URL).
 */
export const TrackSchema = Schema.Struct({
	title: Schema.String,
	artist: Schema.String,
	url: Schema.URL,
	duration_ms: Schema.Number.pipe(Schema.nonNegative()),
	genre: Schema.optional(Schema.String),
	tags: Schema.optional(Schema.Array(Schema.String)),
	artwork_url: Schema.optional(Schema.String),
	liked_at: Schema.optional(Schema.String),
	playback_count: Schema.optional(Schema.Number.pipe(Schema.nonNegative())),
	likes_count: Schema.optional(Schema.Number.pipe(Schema.nonNegative())),
});

export type Track = Schema.Schema.Type<typeof TrackSchema>;

/**
 * Decode unknown input to Track. Invalid data produces InvalidTrack (typed error), no throw.
 * Returns Either<Track, InvalidTrack> (Right = success, Left = InvalidTrack).
 */
export function decodeTrack(input: unknown): Either.Either<Track, InvalidTrack> {
	return Either.mapLeft(
		Schema.decodeUnknownEither(TrackSchema)(input),
		(parseError) => new InvalidTrack({ reason: parseError.toString() }),
	);
}
