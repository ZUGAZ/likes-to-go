import { describe, expect, it } from '@effect/vitest';
import {
	Background,
	Content,
	isBackground,
	layerPortServer,
	makeBackgroundClient,
	PageLifecycleNone,
	Presence,
} from 'browser-extension-kit/messaging';
import { makeFakePortHub } from 'browser-extension-kit/testing';
import {
	Cause,
	Deferred,
	Effect,
	Equal,
	Exit,
	Fiber,
	HashMap,
	Layer,
	Option,
	SubscriptionRef,
	TestClock,
} from 'effect';

import { dispatchEffect } from '@/background/background-dispatch';
import { makeBackgroundLayer } from '@/background/background-layer';
import { CommandRunnerTag, runCommand } from '@/background/command-runner';
import { ContentCommandsTag } from '@/background/content-commands';
import { ContentCommandsRpc } from '@/background/infrastructure/content-commands-rpc';
import { StateRefTag } from '@/background/state-ref';
import { CollectionTabSelected } from '@/common/model/collection/events/collection-tab-selected';
import { isSendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';
import { ContentRpcs } from '@/common/model/messaging/content-rpcs';
import {
	BACKGROUND_RPC_PORT_NAME,
	CONTENT_RPC_PORT_NAME,
} from '@/common/model/messaging/port-names';
import { BackgroundRpcs } from '@/common/model/messaging/background-rpcs';
import { CollectingRequested } from '@/common/model/collection/states/collecting-requested';
import { isErrorState } from '@/common/model/collection/states/error-state';
import { makeInMemoryStorage } from '@/test/background-test-layer';
import { makeCapturingLogger, silentLoggerLayer } from '@/test/effect-log-test';

const contentFrame = new Content({ tabId: 1, frameId: 0 });

const recordingHandlers = (
	names: Array<string>,
	hang?: Deferred.Deferred<void>,
) =>
	ContentRpcs.toLayer({
		StartPageCollection: () =>
			Effect.sync(() => {
				names.push('StartPageCollection');
			}).pipe(
				Effect.andThen(hang === undefined ? Effect.void : Deferred.await(hang)),
			),
		CancelPageCollection: () =>
			Effect.sync(() => {
				names.push('CancelPageCollection');
			}),
		ToggleMascot: () =>
			Effect.sync(() => {
				names.push('ToggleMascot');
			}),
		ShowMascot: () =>
			Effect.sync(() => {
				names.push('ShowMascot');
			}),
	});

const background = (
	hub: Effect.Effect.Success<typeof makeFakePortHub>,
	logger = silentLoggerLayer,
	storage = makeInMemoryStorage(),
	commandRunner = Layer.succeed(CommandRunnerTag, { run: () => Effect.void }),
) =>
	makeBackgroundLayer({
		portConnector: hub.layerFor(new Background()),
		storage,
		commandRunner,
		contentCommands: ContentCommandsRpc,
		logger,
	});

describe('ContentCommandsRpc', () => {
	it.scoped('calls content that is present', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const names: Array<string> = [];
			const env = yield* Layer.build(background(hub));
			yield* Layer.build(
				layerPortServer(ContentRpcs, { name: CONTENT_RPC_PORT_NAME }).pipe(
					Layer.provide(recordingHandlers(names)),
					Layer.provide(hub.layerFor(contentFrame)),
					Layer.provide(silentLoggerLayer),
				),
			);
			yield* makeBackgroundClient(BackgroundRpcs, {
				name: BACKGROUND_RPC_PORT_NAME,
			}).pipe(
				Effect.provide(hub.layerFor(contentFrame)),
				Effect.provide(PageLifecycleNone),
				Effect.provide(silentLoggerLayer),
			);
			yield* Effect.gen(function* () {
				const presence = yield* Presence;
				for (let attempt = 0; attempt < 40; attempt += 1) {
					if (HashMap.has(yield* presence.get, contentFrame)) {
						return;
					}
					yield* Effect.yieldNow();
				}
				return yield* Effect.die('content presence did not open');
			}).pipe(Effect.provide(env));
			yield* ContentCommandsTag.pipe(
				Effect.flatMap((commands) => commands.startPageCollection(1)),
				Effect.provide(env),
			);
			expect(names).toEqual(['StartPageCollection']);
		}),
	);

	it.scoped('fails an absent tab only after the retry schedule', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const env = yield* Layer.build(background(hub));
			const fiber = yield* ContentCommandsTag.pipe(
				Effect.flatMap((commands) => commands.startPageCollection(9)),
				Effect.provide(env),
				Effect.fork,
			);
			yield* TestClock.adjust('2999 millis');
			expect(Option.isNone(yield* Fiber.poll(fiber))).toBe(true);
			yield* TestClock.adjust('1 millis');
			const exit = yield* Fiber.join(fiber).pipe(Effect.exit);
			expect(Exit.isFailure(exit)).toBe(true);
			if (Exit.isFailure(exit)) {
				const failure = Cause.failureOption(exit.cause);
				expect(
					Option.isSome(failure) &&
						isSendToTabFailed(failure.value) &&
						failure.value.reason.startsWith('ReceiverUnavailable'),
				).toBe(true);
			}
			const ports = yield* hub.openPorts;
			expect(
				ports.some(
					(port) =>
						isBackground(port.from) &&
						Equal.equals(port.to, new Content({ tabId: 9, frameId: 0 })),
				),
			).toBe(false);
		}),
	);

	it.scoped('does not retry cancel', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const env = yield* Layer.build(background(hub));
			const exit = yield* ContentCommandsTag.pipe(
				Effect.flatMap((commands) => commands.cancelPageCollection(9)),
				Effect.provide(env),
				Effect.exit,
			);
			expect(Exit.isFailure(exit)).toBe(true);
		}),
	);

	it.scoped('logs a warning when toggle and show never find content', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const logger = makeCapturingLogger();
			const env = yield* Layer.build(background(hub, logger.layer));
			const commands = yield* ContentCommandsTag.pipe(Effect.provide(env));
			const toggle = yield* commands.toggleMascot(9).pipe(Effect.fork);
			const show = yield* commands.showMascot(9).pipe(Effect.fork);
			yield* TestClock.adjust('1400 millis');
			yield* Fiber.join(toggle);
			yield* Fiber.join(show);
			const warnings = logger
				.messages()
				.filter((message) => JSON.stringify(message).includes('send failed'));
			expect(warnings).toHaveLength(2);
		}),
	);

	it.scoped('succeeds on the next retry when content connects late', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const names: Array<string> = [];
			const env = yield* Layer.build(background(hub));
			const fiber = yield* ContentCommandsTag.pipe(
				Effect.flatMap((commands) => commands.startPageCollection(1)),
				Effect.provide(env),
				Effect.fork,
			);
			yield* TestClock.adjust('500 millis');
			expect(Option.isNone(yield* Fiber.poll(fiber))).toBe(true);
			yield* Layer.build(
				layerPortServer(ContentRpcs, { name: CONTENT_RPC_PORT_NAME }).pipe(
					Layer.provide(recordingHandlers(names)),
					Layer.provide(hub.layerFor(contentFrame)),
					Layer.provide(silentLoggerLayer),
				),
			);
			yield* makeBackgroundClient(BackgroundRpcs, {
				name: BACKGROUND_RPC_PORT_NAME,
			}).pipe(
				Effect.provide(hub.layerFor(contentFrame)),
				Effect.provide(PageLifecycleNone),
				Effect.provide(silentLoggerLayer),
			);
			yield* Effect.gen(function* () {
				const presence = yield* Presence;
				for (let attempt = 0; attempt < 40; attempt += 1) {
					if (HashMap.has(yield* presence.get, contentFrame)) {
						return;
					}
					yield* Effect.yieldNow();
				}
				return yield* Effect.die('content presence did not open');
			}).pipe(Effect.provide(env));
			yield* TestClock.adjust('100 millis');
			yield* Fiber.join(fiber);
			expect(names).toEqual(['StartPageCollection']);
		}),
	);

	it.scoped(
		'fails with disconnected after navigation drops an in-flight call',
		() =>
			Effect.gen(function* () {
				const hub = yield* makeFakePortHub;
				const started = yield* Deferred.make<boolean>();
				const hang = yield* Deferred.make<boolean>();
				const env = yield* Layer.build(background(hub));
				yield* Layer.build(
					layerPortServer(ContentRpcs, { name: CONTENT_RPC_PORT_NAME }).pipe(
						Layer.provide(
							ContentRpcs.toLayer({
								StartPageCollection: () =>
									Deferred.succeed(started, true).pipe(
										Effect.andThen(Deferred.await(hang)),
									),
								CancelPageCollection: () => Effect.void,
								ToggleMascot: () => Effect.void,
								ShowMascot: () => Effect.void,
							}),
						),
						Layer.provide(hub.layerFor(contentFrame)),
						Layer.provide(silentLoggerLayer),
					),
				);
				yield* makeBackgroundClient(BackgroundRpcs, {
					name: BACKGROUND_RPC_PORT_NAME,
				}).pipe(
					Effect.provide(hub.layerFor(contentFrame)),
					Effect.provide(PageLifecycleNone),
					Effect.provide(silentLoggerLayer),
				);
				yield* Effect.gen(function* () {
					const presence = yield* Presence;
					for (let attempt = 0; attempt < 40; attempt += 1) {
						if (HashMap.has(yield* presence.get, contentFrame)) {
							return;
						}
						yield* Effect.yieldNow();
					}
					return yield* Effect.die('content presence did not open');
				}).pipe(Effect.provide(env));
				const fiber = yield* ContentCommandsTag.pipe(
					Effect.flatMap((commands) => commands.startPageCollection(1)),
					Effect.provide(env),
					Effect.fork,
				);
				yield* Deferred.await(started);
				yield* hub.navigateTab(1);
				yield* Effect.yieldNow();
				yield* TestClock.adjust('2999 millis');
				expect(Option.isNone(yield* Fiber.poll(fiber))).toBe(true);
				yield* TestClock.adjust('1 millis');
				const exit = yield* Fiber.join(fiber).pipe(Effect.exit);
				expect(Exit.isFailure(exit)).toBe(true);
				if (Exit.isFailure(exit)) {
					const failure = Cause.failureOption(exit.cause);
					expect(
						Option.isSome(failure) &&
							isSendToTabFailed(failure.value) &&
							failure.value.reason.startsWith('Disconnected'),
					).toBe(true);
				}
			}),
	);

	it.scoped('becomes an error state when start never reaches the page', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const env = yield* Layer.build(
				background(
					hub,
					silentLoggerLayer,
					makeInMemoryStorage({ stored: CollectingRequested() }),
					Layer.succeed(CommandRunnerTag, { run: runCommand }),
				),
			);
			Object.defineProperty(globalThis, 'chrome', {
				configurable: true,
				writable: true,
				value: {
					tabs: {
						update: () =>
							Promise.resolve({
								windowId: 1,
							}),
					},
					windows: {
						update: () => Promise.resolve({}),
					},
				},
			});
			const fiber = yield* dispatchEffect(
				CollectionTabSelected({
					sourceUrl: 'https://soundcloud.com/you/likes',
					tabId: 9,
				}),
			).pipe(Effect.provide(env), Effect.fork);
			yield* TestClock.adjust('3 seconds');
			yield* Fiber.join(fiber);
			const state = yield* StateRefTag.pipe(
				Effect.flatMap(SubscriptionRef.get),
				Effect.provide(env),
			);
			expect(isErrorState(state)).toBe(true);
		}),
	);
});
