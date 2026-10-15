import { describe, expect, it } from 'vitest';
import { Schema } from 'effect';

import { collectionStateToGetStateResponse } from '@/common/model/collection/state-to-response';
import { Done } from '@/common/model/collection/states/done';
import { Saving } from '@/common/model/collection/states/saving';
import { TrackSchema } from '@/common/model/track';

function validTrack() {
	return Schema.decodeUnknownSync(TrackSchema)({
		title: 'Track',
		artist: 'Artist',
		url: 'https://soundcloud.com/artist/track',
	});
}

describe('collectionStateToGetStateResponse', () => {
	it('includes skippedTrackCount for Done and Saving', () => {
		const tracks = [validTrack()];
		expect(
			collectionStateToGetStateResponse(Done({ tracks, skippedTrackCount: 2 }))
				.skippedTrackCount,
		).toBe(2);
		expect(
			collectionStateToGetStateResponse(
				Saving({ tracks, skippedTrackCount: 2 }),
			).skippedTrackCount,
		).toBe(2);
	});
});
