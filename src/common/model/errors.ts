import { Data } from "effect";

/**
 * Invalid runtime message (e.g. from Chrome messaging). Payload failed validation.
 */
export class InvalidMessage extends Data.TaggedError("InvalidMessage")<{
	readonly reason: string;
}> {}

/**
 * Invalid track data (e.g. from DOM or TracksBatch payload).
 */
export class InvalidTrack extends Data.TaggedError("InvalidTrack")<{
	readonly reason: string;
}> {}
