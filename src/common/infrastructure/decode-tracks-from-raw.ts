import { Either, Schema } from "effect";
import type { RawTrack } from "@/common/infrastructure/dom-reader";
import type { Track } from "@/common/model/track";
import { TrackSchema } from "@/common/model/track";

/**
 * Decode raw DOM-reader output to validated Track[]. Invalid items are skipped.
 */
export function decodeTracksFromRaw(raw: RawTrack[]): Track[] {
	const tracks: Track[] = [];
	for (const r of raw) {
		const decoded = Schema.decodeUnknownEither(TrackSchema)(r);
		if (Either.isRight(decoded)) {
			tracks.push(decoded.right);
		}
	}
	return tracks;
}
