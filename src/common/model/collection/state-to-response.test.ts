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
	it('includes export body only while saving', () => {
		const tracks = [validTrack()];
		const saving = Saving({ tracks, skippedTrackCount: 0 });
		const done = Done({ tracks, skippedTrackCount: 0 });

		const savingResponse = collectionStateToDownloadExportResponse(
			saving,
			'json',
		);
		expect(savingResponse.status).toBe('saving');
		expect(typeof savingResponse.exportBody).toBe('string');
		if (savingResponse.exportBody === undefined) {
			throw new Error('expected export body while saving');
		}
		const parsed: unknown = JSON.parse(savingResponse.exportBody);
		expect(parsed).toMatchObject({ format_version: 1, track_count: 1 });

		expect(
			collectionStateToGetStateResponse(saving).exportBody,
		).toBeUndefined();
		expect(
			collectionStateToDownloadExportResponse(done).exportBody,
		).toBeUndefined();
	});

	it('sets exportBody to CSV when format is csv', () => {
		const tracks = [validTrack()];
		const saving = Saving({ tracks, skippedTrackCount: 0 });
		const response = collectionStateToDownloadExportResponse(saving, 'csv');
		expect(response.exportBody).toBe('title,artist\nTrack,Artist');
		expect(response.exportBody).not.toContain('http');
	});

	it('sets exportBody to Text when format is txt', () => {
		const tracks = [validTrack()];
		const saving = Saving({ tracks, skippedTrackCount: 0 });
		const response = collectionStateToDownloadExportResponse(saving, 'txt');
		expect(response.exportBody).toBe('Artist - Track\n');
		expect(response.exportBody).not.toContain('http');
		expect(response.exportBody).not.toContain('s:"');
	});

	it('sets exportBody to M3U when format is m3u', () => {
		const tracks = [validTrack()];
		const saving = Saving({ tracks, skippedTrackCount: 0 });
		const response = collectionStateToDownloadExportResponse(saving, 'm3u');
		expect(response.exportBody).toBe(
			'#EXTM3U\n#EXTINF:-1,Artist - Track\nhttps://soundcloud.com/artist/track\n',
		);
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
