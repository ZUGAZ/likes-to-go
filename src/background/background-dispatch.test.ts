import { dispatchEffect } from '@/background/background-dispatch';
import { handleCollectionTabNavigationEffect } from '@/background/collection-tab-navigation';
import { CommandRunnerTag } from '@/background/command-runner';
import { StateRefTag } from '@/background/state-ref';
import { CollectionTabSelected } from '@/common/model/collection/events/collection-tab-selected';
import { COLLECTION_SOURCE_INVALIDATED_MESSAGE } from '@/common/model/collection/events/collection-source-invalidated';
import { CollectionComplete } from '@/common/model/collection/events/collection-complete';
import { LoginVerified } from '@/common/model/collection/events/login-verified';
import { StartCollection } from '@/common/model/collection/events/start-collection';
import {
	Collecting,
	isCollecting,
} from '@/common/model/collection/states/collecting';
import { TracksBatch } from '@/common/model/collection/events/tracks-batch';
import { makeBackgroundTestLayer } from '@/test/background-test-layer';
import { Effect, Layer, SubscriptionRef } from 'effect';
import { describe, expect, it } from 'vitest';

function makeStubCommandRunner(
	recordedCommands: Array<{ _tag: string; [k: string]: unknown }>,
): Layer.Layer<CommandRunnerTag> {
	return Layer.succeed(CommandRunnerTag, {
		run: (cmd) => {
			recordedCommands.push({ ...cmd });
			return Effect.void;
		},
	});
}

function dispatchTestLayer(
	recordedCommands: Array<{ _tag: string; [k: string]: unknown }>,
) {
	return makeBackgroundTestLayer({
		commandRunner: makeStubCommandRunner(recordedCommands),
	});
}

describe('background dispatch', () => {
	it('dispatchEffect(StartCollection) emits CheckLogin, then LoginVerified selects a tab; CollectionTabSelected yields Collecting', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const testLayer = dispatchTestLayer(recordedCommands);

		const program = Effect.gen(function* () {
			yield* dispatchEffect(StartCollection());
			yield* dispatchEffect(LoginVerified());
			yield* dispatchEffect(
				CollectionTabSelected({
					sourceUrl: 'https://soundcloud.com/artist/track',
					tabId: 42,
				}),
			);
			const ref = yield* StateRefTag;
			return yield* SubscriptionRef.get(ref);
		}).pipe(Effect.provide(testLayer));

		const state = await Effect.runPromise(program);

		expect(recordedCommands).toMatchObject([
			{ _tag: 'CheckLogin' },
			{ _tag: 'SelectCollectionTab' },
			{ _tag: 'SendStartToTab', tabId: 42 },
		]);

		expect(isCollecting(state)).toBe(true);
		if (isCollecting(state)) {
			expect(state.tabId).toBe(42);
			expect(state.sourceUrl).toBe('https://soundcloud.com/artist/track');
			expect(state.tracks).toEqual([]);
		}
	});

	it('handleCollectionTabNavigationEffect cancels when the active collection tab navigates away', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const testLayer = dispatchTestLayer(recordedCommands);

		const program = Effect.gen(function* () {
			yield* dispatchEffect(StartCollection());
			yield* dispatchEffect(
				CollectionTabSelected({
					sourceUrl: 'https://soundcloud.com/artist/track',
					tabId: 42,
				}),
			);
			yield* handleCollectionTabNavigationEffect(42, 'https://example.com');
			const ref = yield* StateRefTag;
			return yield* SubscriptionRef.get(ref);
		}).pipe(Effect.provide(testLayer));

		const state = await Effect.runPromise(program);

		expect(state).toMatchObject({
			_tag: 'Error',
			message: COLLECTION_SOURCE_INVALIDATED_MESSAGE,
		});
		expect(recordedCommands.map((command) => command._tag)).toEqual([
			'CheckLogin',
			'SendStartToTab',
			'SendCancelToTab',
		]);
	});

	it('handleCollectionTabNavigationEffect ignores same-url updates and other tabs', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const testLayer = dispatchTestLayer(recordedCommands);

		const program = Effect.gen(function* () {
			yield* dispatchEffect(StartCollection());
			yield* dispatchEffect(
				CollectionTabSelected({
					sourceUrl: 'https://soundcloud.com/artist/track',
					tabId: 42,
				}),
			);
			yield* handleCollectionTabNavigationEffect(
				42,
				'https://soundcloud.com/artist/track',
			);
			yield* handleCollectionTabNavigationEffect(43, 'https://example.com');
			const ref = yield* StateRefTag;
			return yield* SubscriptionRef.get(ref);
		}).pipe(Effect.provide(testLayer));

		const state = await Effect.runPromise(program);

		expect(isCollecting(state)).toBe(true);
		expect(recordedCommands.map((command) => command._tag)).toEqual([
			'CheckLogin',
			'SendStartToTab',
		]);
	});

	it('handleCollectionTabNavigationEffect ignores navigation after normal completion', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const testLayer = dispatchTestLayer(recordedCommands);

		const program = Effect.gen(function* () {
			yield* dispatchEffect(StartCollection());
			yield* dispatchEffect(
				CollectionTabSelected({
					sourceUrl: 'https://soundcloud.com/artist/track',
					tabId: 42,
				}),
			);
			yield* dispatchEffect(CollectionComplete());
			yield* handleCollectionTabNavigationEffect(42, 'https://example.com');
			const ref = yield* StateRefTag;
			return yield* SubscriptionRef.get(ref);
		}).pipe(Effect.provide(testLayer));

		const state = await Effect.runPromise(program);

		expect(state).toMatchObject({ _tag: 'Done' });
		expect(recordedCommands.map((command) => command._tag)).toEqual([
			'CheckLogin',
			'SendStartToTab',
		]);
	});

	it('applies two concurrent dispatches without losing an update', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const firstTrack = {
			title: 'First',
			artist: 'Artist',
			url: new URL('https://soundcloud.com/artist/first'),
		};
		const secondTrack = {
			title: 'Second',
			artist: 'Artist',
			url: new URL('https://soundcloud.com/artist/second'),
		};
		const testLayer = makeBackgroundTestLayer({
			state: Collecting({
				sourceUrl: 'https://soundcloud.com/you/likes',
				tabId: 7,
				tracks: [],
				skippedTrackCount: 0,
			}),
			commandRunner: makeStubCommandRunner(recordedCommands),
		});

		const state = await Effect.runPromise(
			Effect.gen(function* () {
				yield* Effect.all(
					[
						dispatchEffect(
							TracksBatch({ tracks: [firstTrack], skippedTrackCount: 0 }),
						),
						dispatchEffect(
							TracksBatch({ tracks: [secondTrack], skippedTrackCount: 0 }),
						),
					],
					{ concurrency: 'unbounded' },
				);
				const ref = yield* StateRefTag;
				return yield* SubscriptionRef.get(ref);
			}).pipe(Effect.provide(testLayer)),
		);

		expect(isCollecting(state)).toBe(true);
		if (isCollecting(state)) {
			expect(state.tracks.map((track) => track.title).sort()).toEqual([
				'First',
				'Second',
			]);
		}
	});
});
