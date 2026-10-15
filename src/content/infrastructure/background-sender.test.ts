import { describe, expect, it } from '@effect/vitest';
import {
	Background,
	Content,
	isBackground,
	isContent,
} from 'browser-extension-kit/messaging';
import {
	makeFakePageLifecycle,
	makeFakePortHub,
} from 'browser-extension-kit/testing';
import {
	Context,
	Duration,
	Effect,
	Exit,
	Fiber,
	Layer,
	Option,
	Stream,
	SubscriptionRef,
	TestClock,
} from 'effect';

import { makeBackgroundLayer } from '@/background/background-layer';
import { CommandRunnerTag } from '@/background/command-runner';
import { ContentCommandsRpc } from '@/background/infrastructure/content-commands-rpc';
import { StateRefTag } from '@/background/state-ref';
import { isCollecting } from '@/common/model/collection/states/collecting';
import { Collecting } from '@/common/model/collection/states/collecting';
import { isDone } from '@/common/model/collection/states/done';
import { isErrorState } from '@/common/model/collection/states/error-state';
import { isIdle } from '@/common/model/collection/states/idle';
import { isPaused } from '@/common/model/collection/states/paused';
import { BACKGROUND_RPC_PORT_NAME } from '@/common/model/messaging/port-names';
import { BackgroundSenderTag } from '@/content/infrastructure/background-sender';
import { SendToBackgroundFailed } from '@/content/model/send-to-background-failed';
import { makeContentLayer } from '@/content/runtime/content-layer';
import { CollectionBackendTag } from '@/mascot/collection-backend';
import type { MascotVisibilityControls } from '@/mascot/visibility';
import { makeInMemoryStorage } from '@/test/background-test-layer';
import { silentLoggerLayer } from '@/test/effect-log-test';

const contentFrame = new Content({ tabId: 7, frameId: 0 });

const track = (name: string) => ({
	title: name,
	artist: 'Artist',
	url: new URL(`https://soundcloud.com/artist/${name}`),
});

const collecting = Collecting({
	sourceUrl: 'https://soundcloud.com/you/likes',
	tabId: 7,
	tracks: [],
	skippedTrackCount: 0,
});

const visibility: MascotVisibilityControls = {
	isVisible: () => false,
	summon: () => undefined,
	dismiss: () => undefined,
	toggle: () => undefined,
};

const settle = Effect.gen(function* () {
	for (let step = 0; step < 20; step += 1) {
		yield* Effect.yieldNow();
	}
});

const isSendFailed = (error: unknown): error is SendToBackgroundFailed =>
	error instanceof SendToBackgroundFailed;

const openStack = (loadDelay?: Duration.DurationInput) =>
	Effect.gen(function* () {
		const hub = yield* makeFakePortHub;
		const lifecycle = yield* makeFakePageLifecycle;
		const env = yield* Layer.build(
			makeBackgroundLayer({
				portConnector: hub.layerFor(new Background()),
				storage: makeInMemoryStorage(
					loadDelay === undefined
						? { stored: collecting }
						: { stored: collecting, loadDelay },
				),
				commandRunner: Layer.succeed(CommandRunnerTag, {
					run: () => Effect.void,
				}),
				contentCommands: ContentCommandsRpc,
				logger: silentLoggerLayer,
			}),
		);
		const content = yield* Layer.build(
			makeContentLayer({
				visibility,
				portConnector: hub.layerFor(contentFrame),
				pageLifecycle: lifecycle.layer,
				logger: silentLoggerLayer,
			}),
		);
		return {
			hub,
			env,
			sender: Context.get(content, BackgroundSenderTag),
			backend: Context.get(content, CollectionBackendTag),
			readState: StateRefTag.pipe(
				Effect.flatMap(SubscriptionRef.get),
				Effect.provide(env),
			),
		};
	});

const waitForContentPort = (
	hub: Effect.Effect.Success<typeof makeFakePortHub>,
) =>
	Effect.gen(function* () {
		for (let step = 0; step < 40; step += 1) {
			const ports = yield* hub.openPorts;
			if (ports.some((port) => isContent(port.from) && isBackground(port.to))) {
				return;
			}
			yield* Effect.yieldNow();
		}
		return yield* Effect.die('content port did not open');
	});

describe('BackgroundSenderLive', () => {
	it.scoped('uses one content port for the subscription and a batch', () =>
		Effect.gen(function* () {
			const stack = yield* openStack();
			yield* stack.backend.collectionUpdates.pipe(
				Stream.runDrain,
				Effect.forkScoped,
			);
			yield* waitForContentPort(stack.hub);
			yield* stack.sender.sendBatch({
				tracks: [track('one')],
				skippedTrackCount: 0,
			});
			const ports = yield* stack.hub.openPorts;
			const towardBackground = ports.filter(
				(port) =>
					isContent(port.from) &&
					isBackground(port.to) &&
					port.name === BACKGROUND_RPC_PORT_NAME,
			);
			expect(towardBackground).toHaveLength(1);
		}),
	);

	it.scoped(
		'records each collection report through the background handlers',
		() =>
			Effect.gen(function* () {
				const reported = yield* openStack();
				yield* waitForContentPort(reported.hub);
				yield* reported.sender.sendBatch({
					tracks: [track('one')],
					skippedTrackCount: 1,
				});
				yield* settle;
				const afterBatch = yield* reported.readState;
				expect(
					isCollecting(afterBatch) &&
						afterBatch.tracks.map((item) => item.title),
				).toEqual(['one']);

				yield* reported.sender.sendVisibilityPaused();
				yield* settle;
				expect(isPaused(yield* reported.readState)).toBe(true);
				yield* reported.sender.sendVisibilityResumed();
				yield* settle;
				expect(isCollecting(yield* reported.readState)).toBe(true);
				yield* reported.sender.sendComplete();
				yield* settle;
				const done = yield* reported.readState;
				expect(isDone(done) && done.tracks.map((item) => item.title)).toEqual([
					'one',
				]);

				const failed = yield* openStack();
				yield* waitForContentPort(failed.hub);
				yield* failed.sender.sendError(
					'Could not read your likes list',
					'scan',
				);
				yield* settle;
				const errorState = yield* failed.readState;
				expect(
					isErrorState(errorState) &&
						errorState.message === 'Could not read your likes list',
				).toBe(true);

				const login = yield* openStack();
				yield* waitForContentPort(login.hub);
				yield* login.sender.sendLoginRequired('Sign in', 'cookie');
				yield* settle;
				const loginState = yield* login.readState;
				expect(
					isErrorState(loginState) && loginState.reason === 'login-required',
				).toBe(true);
			}),
	);

	it.scoped('completes a discard send before the background applies it', () =>
		Effect.gen(function* () {
			const stack = yield* openStack('1 minute');
			yield* waitForContentPort(stack.hub);
			const sent = yield* stack.sender
				.sendBatch({ tracks: [track('later')], skippedTrackCount: 0 })
				.pipe(Effect.fork);
			yield* settle;
			const polled = yield* Fiber.poll(sent);
			expect(Option.isSome(polled) && Exit.isSuccess(polled.value)).toBe(true);
			expect(isIdle(yield* stack.readState)).toBe(true);
			yield* TestClock.adjust('1 minute');
			yield* settle;
			const applied = yield* stack.readState;
			expect(
				isCollecting(applied) && applied.tracks.map((item) => item.title),
			).toEqual(['later']);
		}),
	);

	it.scoped('waits out a service-worker stop and then applies the batch', () =>
		Effect.gen(function* () {
			const stack = yield* openStack();
			yield* waitForContentPort(stack.hub);
			yield* stack.hub.stopServiceWorker;
			const sent = yield* stack.sender
				.sendBatch({ tracks: [track('again')], skippedTrackCount: 0 })
				.pipe(Effect.fork);
			yield* Effect.yieldNow();
			expect(Option.isNone(yield* Fiber.poll(sent))).toBe(true);
			yield* TestClock.adjust('200 millis');
			yield* settle;
			expect(Exit.isSuccess(yield* Fiber.join(sent).pipe(Effect.exit))).toBe(
				true,
			);
			const state = yield* stack.readState;
			expect(isErrorState(state)).toBe(false);
			expect(
				isCollecting(state) && state.tracks.map((item) => item.title),
			).toEqual(['again']);
		}),
	);

	it.scoped('fails a terminal client without retrying', () =>
		Effect.gen(function* () {
			const stack = yield* openStack();
			yield* waitForContentPort(stack.hub);
			yield* stack.hub.invalidateExtensionContext(contentFrame);
			const failed = yield* stack.sender
				.sendBatch({ tracks: [track('gone')], skippedTrackCount: 0 })
				.pipe(Effect.flip);
			expect(isSendFailed(failed)).toBe(true);
			if (isSendFailed(failed)) {
				expect(failed.reason).toContain('ExtensionContextInvalidated');
			}
			const second = yield* stack.sender
				.sendBatch({ tracks: [track('still')], skippedTrackCount: 0 })
				.pipe(Effect.flip);
			expect(
				isSendFailed(second) &&
					second.reason.includes('ExtensionContextInvalidated'),
			).toBe(true);
		}),
	);
});
