import { describe, expect, it } from '@effect/vitest';
import {
	Background,
	makeBackgroundClient,
	PageLifecycleNone,
	Popup,
} from 'browser-extension-kit/messaging';
import { makeFakePortHub } from 'browser-extension-kit/testing';
import {
	Effect,
	Fiber,
	Layer,
	ManagedRuntime,
	Option,
	Stream,
	SubscriptionRef,
	TestClock,
} from 'effect';

import { makeBackgroundLayer } from '@/background/background-layer';
import { CommandRunnerTag } from '@/background/command-runner';
import { DispatchLaneTag } from '@/background/dispatch-lane';
import { LoadCollectionStateFailed } from '@/background/infrastructure/collection-state-storage';
import type { BackgroundEnv } from '@/background/runtime/background-env';
import {
	CollectionStateHydratedTag,
	StateRefTag,
} from '@/background/state-ref';
import { BackgroundRpcs } from '@/common/model/messaging/background-rpcs';
import { BACKGROUND_RPC_PORT_NAME } from '@/common/model/messaging/port-names';
import { Collecting } from '@/common/model/collection/states/collecting';
import { isIdle } from '@/common/model/collection/states/idle';
import {
	makeFailingStorage,
	makeInMemoryStorage,
	makeRecordingContentCommands,
} from '@/test/background-test-layer';
import { makeCapturingLogger, silentLoggerLayer } from '@/test/effect-log-test';
import { Ref } from 'effect';

const track = (name: string) => ({
	title: name,
	artist: 'Artist',
	url: new URL(`https://soundcloud.com/artist/${name}`),
});

const storedCollecting = Collecting({
	sourceUrl: 'https://soundcloud.com/you/likes',
	tabId: 7,
	tracks: [track('one'), track('two')],
	skippedTrackCount: 0,
});

const backgroundFor = (
	hub: Effect.Effect.Success<typeof makeFakePortHub>,
	storage: ReturnType<typeof makeInMemoryStorage>,
	logger = silentLoggerLayer,
) =>
	makeBackgroundLayer({
		portConnector: hub.layerFor(new Background()),
		storage,
		commandRunner: Layer.succeed(CommandRunnerTag, {
			run: () => Effect.void,
		}),
		contentCommands: makeRecordingContentCommands().layer,
		logger,
	});

describe('background layer', () => {
	it.scoped('hydrates after a synchronous build', () =>
		Effect.gen(function* () {
			const startupHub = yield* makeFakePortHub;
			yield* Effect.sync(() => {
				const managed = ManagedRuntime.make(
					backgroundFor(
						startupHub,
						makeInMemoryStorage({
							stored: storedCollecting,
							loadDelay: '50 millis',
						}),
					),
				);
				managed.runSync(Effect.runtime<BackgroundEnv>());
				void managed.dispose();
			});

			const hub = yield* makeFakePortHub;
			const layer = backgroundFor(
				hub,
				makeInMemoryStorage({
					stored: storedCollecting,
					loadDelay: '50 millis',
				}),
			);
			yield* Layer.build(layer);
			const { client } = yield* makeBackgroundClient(BackgroundRpcs, {
				name: BACKGROUND_RPC_PORT_NAME,
			}).pipe(
				Effect.provide(hub.layerFor(new Popup())),
				Effect.provide(PageLifecycleNone),
				Effect.provide(silentLoggerLayer),
			);
			const fiber = yield* client
				.WatchCollectionState()
				.pipe(Stream.take(1), Stream.runHead, Effect.fork);
			yield* Effect.yieldNow();
			expect(Option.isNone(yield* Fiber.poll(fiber))).toBe(true);
			yield* TestClock.adjust('50 millis');
			const first = yield* Fiber.join(fiber);
			expect(Option.isSome(first)).toBe(true);
			if (Option.isSome(first)) {
				expect(first.value.status).toBe('collecting');
				expect(first.value.trackCount).toBe(2);
				expect(first.value.isCollectionTab).toBe(false);
			}
		}),
	);

	it.scoped('opens the gate when hydration fails', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const logger = makeCapturingLogger();
			const ran = yield* Ref.make(false);
			const env = yield* Layer.build(
				backgroundFor(
					hub,
					makeFailingStorage(new LoadCollectionStateFailed({ reason: 'disk' })),
					logger.layer,
				),
			);
			yield* CollectionStateHydratedTag.pipe(
				Effect.flatMap((gate) => gate.await),
				Effect.provide(env),
			);
			const state = yield* StateRefTag.pipe(
				Effect.flatMap(SubscriptionRef.get),
				Effect.provide(env),
			);
			expect(isIdle(state)).toBe(true);
			const lane = yield* DispatchLaneTag.pipe(Effect.provide(env));
			expect(
				yield* lane.submitAndAwait(Ref.set(ran, true).pipe(Effect.as(true))),
			).toBe(true);
			expect(
				logger
					.messages()
					.some((message) =>
						JSON.stringify(message).includes(
							'collection state hydration failed',
						),
					),
			).toBe(true);
		}),
	);
});
