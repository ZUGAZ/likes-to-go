import { describe, expect, it } from 'vitest';
import { Schema } from 'effect';

import {
	collectionStateToDownloadExportResponse,
	collectionStateToGetStateResponse,
} from '@/common/model/collection/state-to-response';
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

describe('collectionStateToDownloadExportResponse', () => {
	it('includes export JSON only while saving', () => {
		const tracks = [validTrack()];
		const saving = Saving({ tracks, skippedTrackCount: 0 });
		const done = Done({ tracks, skippedTrackCount: 0 });

		const savingResponse = collectionStateToDownloadExportResponse(saving);
		expect(savingResponse.status).toBe('saving');
		expect(typeof savingResponse.exportJson).toBe('string');
		if (savingResponse.exportJson === undefined) {
			throw new Error('expected export JSON while saving');
		}
		const parsed: unknown = JSON.parse(savingResponse.exportJson);
		expect(parsed).toMatchObject({ format_version: 1, track_count: 1 });

		expect(
			collectionStateToGetStateResponse(saving).exportJson,
		).toBeUndefined();
		expect(
			collectionStateToDownloadExportResponse(done).exportJson,
		).toBeUndefined();
	});

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
