import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import {
	collectionStateToGetStateResponse,
	initialCollectionState,
	transition,
} from '@/common/model/collection-state';
import { TrackSchema } from '@/common/model/track';

function validTrack(
	overrides: { title?: string; url?: string } = {},
): Schema.Schema.Type<typeof TrackSchema> {
	return Schema.decodeUnknownSync(TrackSchema)({
		title: 'Track',
		artist: 'Artist',
		url: 'https://soundcloud.com/artist/track',
		duration_ms: 120_000,
		...overrides,
	});
}

describe('collection-state', () => {
	describe('progress count = validated tracks only', () => {
		it('GetStateResponse trackCount equals state.tracks.length when Collecting', () => {
			let state = initialCollectionState;
			const r1 = transition(state, { _tag: 'StartCollection' });
			state = r1.state;
			state = transition(state, { _tag: 'TabCreated', tabId: 1 }).state;
			const tracks = [
				validTrack({ title: 'A', url: 'https://soundcloud.com/a/1' }),
				validTrack({ title: 'B', url: 'https://soundcloud.com/b/2' }),
				validTrack({ title: 'C', url: 'https://soundcloud.com/c/3' }),
			];
			state = transition(state, { _tag: 'TracksBatch', tracks }).state;

			const response = collectionStateToGetStateResponse(state);
			expect(response.status).toBe('collecting');
			expect(response.trackCount).toBe(3);
			expect(state._tag === 'Collecting' && state.tracks.length).toBe(3);
		});

		it('GetStateResponse trackCount is 0 when Idle', () => {
			const response = collectionStateToGetStateResponse(initialCollectionState);
			expect(response.trackCount).toBe(0);
		});
	});
});
