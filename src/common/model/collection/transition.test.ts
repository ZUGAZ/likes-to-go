import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import {
	collectionStateToGetStateResponse,
	hasTracks,
	initialCollectionState,
	transition,
} from '@/common/model/collection';
import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
import { ErrorState } from '@/common/model/collection/states/error-state';
import { StartCollection } from '@/common/model/collection/events/start-collection';
import { LoginRequired } from '@/common/model/collection/events/login-required';
import { LoginVerified } from '@/common/model/collection/events/login-verified';
import { GetStateRequested } from '@/common/model/collection/events/get-state-requested';
import { TabCreated } from '@/common/model/collection/events/tab-created';
import { TracksBatch } from '@/common/model/collection/events/tracks-batch';
import { CollectionTabSelected } from '@/common/model/collection/events/collection-tab-selected';
import { CollectionComplete } from '@/common/model/collection/events/collection-complete';
import { CollectionError } from '@/common/model/collection/events/collection-error';
import { CollectionVisibilityPaused } from '@/common/model/collection/events/collection-visibility-paused';
import { CollectionVisibilityResumed } from '@/common/model/collection/events/collection-visibility-resumed';
import { CancelCollection } from '@/common/model/collection/events/cancel-collection';
import { SendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';
import { SourceSelected } from '@/common/model/collection/events/source-selected';
import { TrackSchema } from '@/common/model/track';
import { COLLECTION_VISIBILITY_PAUSED_MESSAGE } from '@/common/model/collection/visibility-paused-message';
import { isPaused } from '@/common/model/collection/states/paused';

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

function makeCollectingState() {
	return transition(
		transition(initialCollectionState, StartCollection()).state,
		CollectionTabSelected({ tabId: 9 }),
	).state;
}

describe('collection-transition', () => {
	describe('progress count = validated tracks only', () => {
		it('StartCollection notifies popup then emits CheckLogin', () => {
			const result = transition(initialCollectionState, StartCollection());

			expect(result.commands[0]).toMatchObject({ _tag: 'NotifyPopup' });
			expect(result.commands[1]).toMatchObject({ _tag: 'CheckLogin' });
		});

		it('Idle + GetStateRequested emits source and login checks without state change', () => {
			const result = transition(initialCollectionState, GetStateRequested());

			expect(result.state).toEqual(initialCollectionState);
			expect(result.commands.map((command) => command._tag)).toEqual([
				'CheckSource',
				'CheckLogin',
			]);
		});

		it('Idle + SourceSelected stores source for get-state response', () => {
			const result = transition(
				initialCollectionState,
				SourceSelected({ source: 'active-soundcloud-tab' }),
			);

			const response = collectionStateToGetStateResponse(result.state);
			expect(response.source).toBe('active-soundcloud-tab');
		});

		it('CollectingRequested + LoginVerified emits SelectCollectionTab', () => {
			const collectingRequested = transition(
				initialCollectionState,
				StartCollection(),
			).state;

			const result = transition(collectingRequested, LoginVerified());
			expect(result.commands[0]).toMatchObject({ _tag: 'SelectCollectionTab' });
		});

		it('CollectingRequested + LoginRequired transitions to ErrorState', () => {
			const collectingRequested = transition(
				initialCollectionState,
				StartCollection(),
			).state;

			const result = transition(
				collectingRequested,
				LoginRequired({
					message: LOGIN_REQUIRED_MESSAGE,
					reason: 'Missing login cookie',
				}),
			);

			expect(result.state).toMatchObject({
				_tag: 'Error',
				message: LOGIN_REQUIRED_MESSAGE,
			});
		});

		it('GetStateResponse status is checking-login when CollectingRequested', () => {
			const collectingRequested = transition(
				initialCollectionState,
				StartCollection(),
			).state;
			const response = collectionStateToGetStateResponse(collectingRequested);
			expect(response.status).toBe('checking-login');
			expect(response.trackCount).toBe(0);
		});

		it('GetStateResponse status is login-required for login ErrorState', () => {
			const response = collectionStateToGetStateResponse(
				ErrorState({ message: LOGIN_REQUIRED_MESSAGE }),
			);
			expect(response.status).toBe('login-required');
			expect(response.message).toBe(LOGIN_REQUIRED_MESSAGE);
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
			expect(response.source).toBeUndefined();
		});

		it('Idle + LoginRequired transitions to login ErrorState and notifies popup', () => {
			const result = transition(
				initialCollectionState,
				LoginRequired({
					message: LOGIN_REQUIRED_MESSAGE,
					reason: 'User nav selector not found in page DOM',
				}),
			);

			expect(result.state).toMatchObject({
				_tag: 'Error',
				message: LOGIN_REQUIRED_MESSAGE,
			});
			expect(result.commands).toHaveLength(1);
			expect(result.commands[0]).toMatchObject({ _tag: 'NotifyPopup' });
		});

		it('Collecting + LoginRequired transitions to ErrorState without closing tab', () => {
			const collecting = makeCollectingState();

			const result = transition(
				collecting,
				LoginRequired({
					message: LOGIN_REQUIRED_MESSAGE,
					reason: 'User nav selector not found in page DOM',
				}),
			);

			expect(result.state).toMatchObject({
				_tag: 'Error',
				message: LOGIN_REQUIRED_MESSAGE,
			});
			expect(result.commands.map((c) => c._tag)).toEqual(['NotifyPopup']);
		});

		it('CollectingRequested + TabCreated transitions to Collecting and notifies popup', () => {
			const collectingRequested = transition(
				initialCollectionState,
				StartCollection(),
			).state;
			const result = transition(collectingRequested, TabCreated({ tabId: 7 }));

			expect(result.commands[0]).toMatchObject({ _tag: 'NotifyPopup' });
			expect(result.state).toMatchObject({
				_tag: 'Collecting',
				tabId: 7,
				tracks: [],
				skippedTrackCount: 0,
			});
		});

		it('CollectingRequested + CollectionTabSelected starts the selected tab immediately', () => {
			const collectingRequested = transition(
				initialCollectionState,
				StartCollection(),
			).state;
			const result = transition(
				collectingRequested,
				CollectionTabSelected({
					tabId: 7,
				}),
			);

			expect(result.commands[0]).toMatchObject({ _tag: 'NotifyPopup' });
			expect(result.commands[1]).toMatchObject({
				_tag: 'SendStartToTab',
				tabId: 7,
			});
			expect(result.state).toMatchObject({
				_tag: 'Collecting',
				tabId: 7,
				tracks: [],
				skippedTrackCount: 0,
			});
		});

		it('Collecting + CollectionComplete transitions to Done without closing tab', () => {
			const collecting = makeCollectingState();

			const result = transition(collecting, CollectionComplete());

			expect(result.state).toMatchObject({ _tag: 'Done' });
			expect(result.commands.map((c) => c._tag)).toEqual(['NotifyPopup']);
		});

		it('Collecting + CollectionError transitions to ErrorState without closing tab', () => {
			const collecting = makeCollectingState();

			const result = transition(
				collecting,
				CollectionError({
					message: 'Could not read your likes list',
					reason: 'selector missing',
				}),
			);

			expect(result.state).toMatchObject({
				_tag: 'Error',
				message: 'Could not read your likes list',
			});
			expect(result.commands.map((c) => c._tag)).toEqual(['NotifyPopup']);
		});

		it('Collecting + SendToTabFailed transitions to ErrorState without closing tab', () => {
			const collecting = makeCollectingState();

			const result = transition(
				collecting,
				SendToTabFailed({
					message: 'Could not open or talk to the likes page',
					reason: 'Receiving end does not exist',
				}),
			);

			expect(result.state).toMatchObject({
				_tag: 'Error',
				message: 'Could not open or talk to the likes page',
			});
			expect(result.commands.map((c) => c._tag)).toEqual(['NotifyPopup']);
		});

		it('Collecting + CancelCollection cancels content without closing tab', () => {
			const collecting = makeCollectingState();

			const result = transition(collecting, CancelCollection());

			expect(result.state).toMatchObject({ _tag: 'Idle' });
			expect(result.commands.map((c) => c._tag)).toEqual([
				'SendCancelToTab',
				'NotifyPopup',
			]);
		});

		it('Collecting + visibility pause transitions to Paused and notifies popup', () => {
			const collecting = makeCollectingState();

			const result = transition(collecting, CollectionVisibilityPaused());
			const response = collectionStateToGetStateResponse(result.state);

			expect(isPaused(result.state)).toBe(true);
			expect(response.status).toBe('paused');
			expect(response.message).toBe(COLLECTION_VISIBILITY_PAUSED_MESSAGE);
			expect(result.commands).toHaveLength(1);
			expect(result.commands[0]).toMatchObject({ _tag: 'NotifyPopup' });
		});

		it('Paused + visibility resume transitions back to Collecting and notifies popup', () => {
			const collecting = makeCollectingState();
			const paused = transition(collecting, CollectionVisibilityPaused()).state;

			const result = transition(paused, CollectionVisibilityResumed());
			const response = collectionStateToGetStateResponse(result.state);

			expect(response.status).toBe('collecting');
			expect(response.message).toBeUndefined();
			expect(result.commands).toHaveLength(1);
			expect(result.commands[0]).toMatchObject({ _tag: 'NotifyPopup' });
		});

		it('Paused + TracksBatch keeps paused status and appends tracks', () => {
			const collecting = makeCollectingState();
			const paused = transition(collecting, CollectionVisibilityPaused()).state;
			const tracks = [validTrack({ url: 'https://soundcloud.com/a/paused' })];

			const result = transition(
				paused,
				TracksBatch({ tracks, skippedTrackCount: 1 }),
			);
			const response = collectionStateToGetStateResponse(result.state);

			expect(response.status).toBe('paused');
			expect(response.trackCount).toBe(1);
			expect(response.skippedTrackCount).toBe(1);
			expect(response.message).toBe(COLLECTION_VISIBILITY_PAUSED_MESSAGE);
		});

		it('Paused + CollectionError transitions to ErrorState without closing tab', () => {
			const paused = transition(
				makeCollectingState(),
				CollectionVisibilityPaused(),
			).state;

			const result = transition(
				paused,
				CollectionError({
					message: 'Could not read your likes list',
					reason: 'inline error',
				}),
			);

			expect(result.state).toMatchObject({
				_tag: 'Error',
				message: 'Could not read your likes list',
			});
			expect(result.commands.map((c) => c._tag)).toEqual(['NotifyPopup']);
		});

		it('Paused + CancelCollection cancels content without closing tab', () => {
			const paused = transition(
				makeCollectingState(),
				CollectionVisibilityPaused(),
			).state;

			const result = transition(paused, CancelCollection());

			expect(result.state).toMatchObject({ _tag: 'Idle' });
			expect(result.commands.map((c) => c._tag)).toEqual([
				'SendCancelToTab',
				'NotifyPopup',
			]);
		});
	});
});
