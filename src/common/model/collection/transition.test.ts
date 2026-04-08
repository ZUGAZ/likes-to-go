import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import {
	collectionStateToGetStateResponse,
	hasTracks,
	initialCollectionState,
	transition,
} from '@/common/model/collection';
import { StartCollection } from '@/common/model/collection/events/start-collection';
import { LoginRequired } from '@/common/model/collection/events/login-required';
import { LoginVerified } from '@/common/model/collection/events/login-verified';
import { GetStateRequested } from '@/common/model/collection/events/get-state-requested';
import { TabCreated } from '@/common/model/collection/events/tab-created';
import { TracksBatch } from '@/common/model/collection/events/tracks-batch';
import { TrackSchema } from '@/common/model/track';

function validTrack(
	overrides: { title?: string; url?: string } = {},
): Schema.Schema.Type<typeof TrackSchema> {
	return Schema.decodeUnknownSync(TrackSchema)({
		title: 'Track',
		artist: 'Artist',
		url: 'https://soundcloud.com/artist/track',
		...overrides,
	});
}

describe('collection-transition', () => {
	describe('progress count = validated tracks only', () => {
		it('StartCollection notifies popup then emits CheckLogin', () => {
			const result = transition(initialCollectionState, StartCollection());

			expect(result.commands[0]).toMatchObject({ _tag: 'NotifyPopup' });
			expect(result.commands[1]).toMatchObject({ _tag: 'CheckLogin' });
		});

		it('Idle + GetStateRequested emits CheckLogin without state change', () => {
			const result = transition(initialCollectionState, GetStateRequested());

			expect(result.state).toEqual(initialCollectionState);
			expect(result.commands).toHaveLength(1);
			expect(result.commands[0]).toMatchObject({ _tag: 'CheckLogin' });
		});

		it('CollectingRequested + LoginVerified emits CreateTab', () => {
			const collectingRequested = transition(
				initialCollectionState,
				StartCollection(),
			).state;

			const result = transition(collectingRequested, LoginVerified());
			expect(result.commands[0]).toMatchObject({ _tag: 'CreateTab' });
		});

		it('CollectingRequested + LoginRequired transitions to ErrorState', () => {
			const collectingRequested = transition(
				initialCollectionState,
				StartCollection(),
			).state;

			const result = transition(
				collectingRequested,
				LoginRequired({
					message: 'Please log in to SoundCloud, then try again.',
					reason: 'Missing _soundcloud_session cookie',
				}),
			);

			expect(result.state).toMatchObject({
				_tag: 'Error',
				message: 'Please log in to SoundCloud, then try again.',
			});
		});

		it('GetStateResponse trackCount equals state.tracks.length when Collecting', () => {
			let state = initialCollectionState;
			const r1 = transition(state, StartCollection());
			state = r1.state;
			state = transition(state, LoginVerified()).state;
			state = transition(state, TabCreated({ tabId: 1 })).state;
			const tracks = [
				validTrack({ title: 'A', url: 'https://soundcloud.com/a/1' }),
				validTrack({ title: 'B', url: 'https://soundcloud.com/b/2' }),
				validTrack({ title: 'C', url: 'https://soundcloud.com/c/3' }),
			];
			state = transition(
				state,
				TracksBatch({ tracks, skippedTrackCount: 2 }),
			).state;

			const response = collectionStateToGetStateResponse(state);
			expect(response.status).toBe('collecting');
			expect(response.trackCount).toBe(3);
			expect(hasTracks(state) && state.tracks.length).toBe(3);
			if (hasTracks(state)) {
				expect(state.skippedTrackCount).toBe(2);
			}
		});

		it('GetStateResponse trackCount is 0 when Idle', () => {
			const response = collectionStateToGetStateResponse(
				initialCollectionState,
			);
			expect(response.trackCount).toBe(0);
		});
	});
});
