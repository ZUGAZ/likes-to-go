import { describe, expect, it } from '@effect/vitest';
import {
	Background,
	Content,
	ExtensionPage,
	makeBackgroundClient,
	PageLifecycleNone,
	Popup,
	StateStatus,
	subscribeState,
	withPortErrors,
} from 'browser-extension-kit/messaging';
import { makeFakePortHub } from 'browser-extension-kit/testing';
import {
	Context,
	Deferred,
	Effect,
	Layer,
	Schedule,
	Option,
	Stream,
	TestClock,
} from 'effect';

import { dispatchEffect } from '@/background/background-dispatch';
import { makeBackgroundLayer } from '@/background/background-layer';
import { CommandRunnerTag } from '@/background/command-runner';
import {
	isPopupOpenEffect,
	PopupPortCountRefTag,
	PopupPresenceRefTag,
} from '@/background/overlay-handoff';
import {
	ContentOverlaySurface,
	getMascotUiSurfaceEffect,
} from '@/background/mascot-ui-surface';
import { StateRefTag } from '@/background/state-ref';
import type { CollectionCommand } from '@/common/model/collection/command';
import { isCheckLogin } from '@/common/model/collection/commands/check-login';
import { isSelectCollectionTab } from '@/common/model/collection/commands/select-collection-tab';
import { CollectionTabSelected } from '@/common/model/collection/events/collection-tab-selected';
import { LoginVerified } from '@/common/model/collection/events/login-verified';
import { BackgroundRpcs } from '@/common/model/messaging/background-rpcs';
import { BACKGROUND_RPC_PORT_NAME } from '@/common/model/messaging/port-names';
import {
	Collecting,
	isCollecting,
} from '@/common/model/collection/states/collecting';
import { isCollectingRequested } from '@/common/model/collection/states/collecting-requested';
import { isDone } from '@/common/model/collection/states/done';
import {
	makeInMemoryStorage,
	makeRecordingContentCommands,
} from '@/test/background-test-layer';
import { silentLoggerLayer } from '@/test/effect-log-test';

const track = (name: string) => ({
	title: name,
	artist: 'Artist',
	url: new URL(`https://soundcloud.com/artist/${name}`),
});

const waitUntilPopupOpen = (
	context: Context.Context<PopupPortCountRefTag | PopupPresenceRefTag>,
) =>
	Effect.gen(function* () {
		for (let attempt = 0; attempt < 40; attempt += 1) {
			if (yield* isPopupOpenEffect) {
				return;
			}
			yield* Effect.yieldNow();
		}
		return yield* Effect.die('popup presence did not open');
	}).pipe(Effect.provide(context));

const collecting = Collecting({
	sourceUrl: 'https://soundcloud.com/you/likes',
	tabId: 1,
	tracks: [],
	skippedTrackCount: 0,
});

describe('background rpc server', () => {
	it.scoped('streams the current view and later transitions', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			yield* Layer.build(
				makeBackgroundLayer({
					portConnector: hub.layerFor(new Background()),
					storage: makeInMemoryStorage(),
					commandRunner: Layer.succeed(CommandRunnerTag, {
						run: () => Effect.void,
					}),
					contentCommands: makeRecordingContentCommands().layer,
					logger: silentLoggerLayer,
				}),
			);
			const { client, connection } = yield* makeBackgroundClient(
				BackgroundRpcs,
				{ name: BACKGROUND_RPC_PORT_NAME },
			).pipe(
				Effect.provide(hub.layerFor(new Popup())),
				Effect.provide(PageLifecycleNone),
				Effect.provide(silentLoggerLayer),
			);
			const first = yield* subscribeState(
				client.WatchCollectionState(),
				connection,
			).pipe(
				Stream.filter(StateStatus.$is('Live')),
				Stream.take(1),
				Stream.runHead,
			);
			expect(Option.isSome(first) && StateStatus.$is('Live')(first.value)).toBe(
				true,
			);
			if (Option.isSome(first) && StateStatus.$is('Live')(first.value)) {
				expect(first.value.value.status).toBe('idle');
			}
			yield* client.StartCollection().pipe(withPortErrors());
			const next = yield* subscribeState(
				client.WatchCollectionState(),
				connection,
			).pipe(
				Stream.filter(StateStatus.$is('Live')),
				Stream.filter((status) => {
					if (!StateStatus.$is('Live')(status)) {
						return false;
					}
					return status.value.status !== 'idle';
				}),
				Stream.take(1),
				Stream.runHead,
			);
			expect(
				Option.isSome(next) &&
					StateStatus.$is('Live')(next.value) &&
					next.value.value.status,
			).toBe('checking-login');
		}),
	);

	it.scoped('applies batches in send order', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const recorded: Array<CollectionCommand> = [];
			const env = yield* Layer.build(
				makeBackgroundLayer({
					portConnector: hub.layerFor(new Background()),
					storage: makeInMemoryStorage({ stored: collecting }),
					commandRunner: Layer.succeed(CommandRunnerTag, {
						run: (command) =>
							Effect.sync(() => {
								recorded.push(command);
							}),
					}),
					contentCommands: makeRecordingContentCommands().layer,
					logger: silentLoggerLayer,
				}),
			);
			const { client } = yield* makeBackgroundClient(BackgroundRpcs, {
				name: BACKGROUND_RPC_PORT_NAME,
			}).pipe(
				Effect.provide(hub.layerFor(new Content({ tabId: 1, frameId: 0 }))),
				Effect.provide(PageLifecycleNone),
				Effect.provide(silentLoggerLayer),
			);
			for (let index = 0; index < 30; index += 1) {
				yield* client
					.TracksBatch(
						{
							tracks: [track(`t${String(index)}`)],
							skippedTrackCount: 0,
						},
						{ discard: true },
					)
					.pipe(withPortErrors());
			}
			yield* client
				.CollectionComplete(undefined, { discard: true })
				.pipe(withPortErrors());
			const done = yield* StateRefTag.pipe(
				Effect.flatMap((ref) =>
					ref.changes.pipe(Stream.filter(isDone), Stream.runHead),
				),
				Effect.provide(env),
			);
			expect(Option.isSome(done)).toBe(true);
			if (Option.isSome(done)) {
				expect(
					isDone(done.value) && done.value.tracks.map((item) => item.title),
				).toEqual(
					Array.from({ length: 30 }, (_, index) => `t${String(index)}`),
				);
			}
			expect(recorded.map((command) => command._tag)).toContain('NotifyPopup');
		}),
	);

	it.scoped('keeps follow-up work after the port closes', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const release = yield* Deferred.make<boolean>();
			const holding = yield* Deferred.make<boolean>();
			const recorded: Array<CollectionCommand> = [];
			const env = yield* Layer.build(
				makeBackgroundLayer({
					portConnector: hub.layerFor(new Background()),
					storage: makeInMemoryStorage(),
					commandRunner: Layer.succeed(CommandRunnerTag, {
						run: (command) =>
							Effect.gen(function* () {
								recorded.push(command);
								if (isCheckLogin(command)) {
									yield* Deferred.succeed(holding, true);
									yield* Deferred.await(release);
									yield* dispatchEffect(LoginVerified());
								} else if (isSelectCollectionTab(command)) {
									yield* dispatchEffect(
										CollectionTabSelected({
											sourceUrl: 'https://soundcloud.com/you/likes',
											tabId: 1,
										}),
									);
								}
							}),
					}),
					contentCommands: makeRecordingContentCommands().layer,
					logger: silentLoggerLayer,
				}),
			);
			const { client } = yield* makeBackgroundClient(BackgroundRpcs, {
				name: BACKGROUND_RPC_PORT_NAME,
			}).pipe(
				Effect.provide(hub.layerFor(new Popup())),
				Effect.provide(PageLifecycleNone),
				Effect.provide(silentLoggerLayer),
			);
			yield* client.StartCollection().pipe(withPortErrors());
			yield* Deferred.await(holding);
			yield* hub.closePopup;
			yield* Deferred.succeed(release, true);
			const state = yield* StateRefTag.pipe(
				Effect.flatMap((ref) =>
					ref.changes.pipe(
						Stream.filter((next) => !isCollectingRequested(next)),
						Stream.runHead,
					),
				),
				Effect.provide(env),
			);
			expect(Option.isSome(state) && isCollecting(state.value)).toBe(true);
			expect(recorded.some(isSelectCollectionTab)).toBe(true);
		}),
	);

	it.scoped('reveals the overlay after popup presence closes', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const commands = makeRecordingContentCommands();
			const recorded: Array<CollectionCommand> = [];
			const env = yield* Layer.build(
				makeBackgroundLayer({
					portConnector: hub.layerFor(new Background()),
					storage: makeInMemoryStorage(),
					commandRunner: Layer.succeed(CommandRunnerTag, {
						run: (command) =>
							Effect.gen(function* () {
								recorded.push(command);
								if (isCheckLogin(command)) {
									yield* dispatchEffect(LoginVerified());
								} else if (isSelectCollectionTab(command)) {
									yield* dispatchEffect(
										CollectionTabSelected({
											sourceUrl: 'https://soundcloud.com/you/likes',
											tabId: 1,
										}),
									);
								}
							}),
					}),
					contentCommands: commands.layer,
					logger: silentLoggerLayer,
				}),
			);
			const { client } = yield* makeBackgroundClient(BackgroundRpcs, {
				name: BACKGROUND_RPC_PORT_NAME,
				reconnectSchedule: Schedule.recurs(0),
			}).pipe(
				Effect.provide(hub.layerFor(new Popup())),
				Effect.provide(PageLifecycleNone),
				Effect.provide(silentLoggerLayer),
			);
			yield* waitUntilPopupOpen(env);
			expect(yield* isPopupOpenEffect.pipe(Effect.provide(env))).toBe(true);
			yield* client.StartCollection().pipe(withPortErrors());
			const ready = yield* StateRefTag.pipe(
				Effect.flatMap((ref) =>
					ref.changes.pipe(Stream.filter(isCollecting), Stream.runHead),
				),
				Effect.provide(env),
			);
			expect(Option.isSome(ready)).toBe(true);
			yield* hub.closePopup;
			yield* Effect.gen(function* () {
				for (let attempt = 0; attempt < 40; attempt += 1) {
					if (!(yield* isPopupOpenEffect)) {
						return;
					}
					yield* Effect.yieldNow();
				}
				return yield* Effect.die('popup presence did not close');
			}).pipe(Effect.provide(env));
			yield* TestClock.adjust('99 millis');
			expect(commands.calls()).toEqual([]);
			yield* TestClock.adjust('1 millis');
			expect(commands.calls()).toEqual([{ command: 'showMascot', tabId: 1 }]);
			expect(
				yield* getMascotUiSurfaceEffect().pipe(Effect.provide(env)),
			).toEqual(ContentOverlaySurface({ tabId: 1 }));
		}),
	);

	it.scoped(
		'does not reveal when the popup reconnects during the grace period',
		() =>
			Effect.gen(function* () {
				const hub = yield* makeFakePortHub;
				const commands = makeRecordingContentCommands();
				const env = yield* Layer.build(
					makeBackgroundLayer({
						portConnector: hub.layerFor(new Background()),
						storage: makeInMemoryStorage(),
						commandRunner: Layer.succeed(CommandRunnerTag, {
							run: (command) =>
								Effect.gen(function* () {
									if (isCheckLogin(command)) {
										yield* dispatchEffect(LoginVerified());
									} else if (isSelectCollectionTab(command)) {
										yield* dispatchEffect(
											CollectionTabSelected({
												sourceUrl: 'https://soundcloud.com/you/likes',
												tabId: 1,
											}),
										);
									}
								}),
						}),
						contentCommands: commands.layer,
						logger: silentLoggerLayer,
					}),
				);
				const popupLayer = hub
					.layerFor(new Popup())
					.pipe(
						Layer.provideMerge(PageLifecycleNone),
						Layer.provideMerge(silentLoggerLayer),
					);
				const { client } = yield* makeBackgroundClient(BackgroundRpcs, {
					name: BACKGROUND_RPC_PORT_NAME,
				}).pipe(Effect.provide(popupLayer));
				yield* waitUntilPopupOpen(env);
				yield* client.StartCollection().pipe(withPortErrors());
				yield* StateRefTag.pipe(
					Effect.flatMap((ref) =>
						ref.changes.pipe(Stream.filter(isCollecting), Stream.runHead),
					),
					Effect.provide(env),
				);
				yield* hub.closePopup;
				yield* Effect.gen(function* () {
					for (let attempt = 0; attempt < 40; attempt += 1) {
						if (!(yield* isPopupOpenEffect)) {
							return;
						}
						yield* Effect.yieldNow();
					}
					return yield* Effect.die('popup presence did not close');
				}).pipe(Effect.provide(env));
				yield* TestClock.adjust('0 millis');
				yield* makeBackgroundClient(BackgroundRpcs, {
					name: BACKGROUND_RPC_PORT_NAME,
				}).pipe(Effect.provide(popupLayer));
				yield* waitUntilPopupOpen(env);
				yield* TestClock.adjust('200 millis');
				expect(commands.calls()).toEqual([]);
			}),
	);

	it.scoped('treats an extension page as an open popup', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const env = yield* Layer.build(
				makeBackgroundLayer({
					portConnector: hub.layerFor(new Background()),
					storage: makeInMemoryStorage(),
					commandRunner: Layer.succeed(CommandRunnerTag, {
						run: () => Effect.void,
					}),
					contentCommands: makeRecordingContentCommands().layer,
					logger: silentLoggerLayer,
				}),
			);
			yield* makeBackgroundClient(BackgroundRpcs, {
				name: BACKGROUND_RPC_PORT_NAME,
			}).pipe(
				Effect.provide(hub.layerFor(new ExtensionPage({ tabId: 5 }))),
				Effect.provide(PageLifecycleNone),
				Effect.provide(silentLoggerLayer),
			);
			yield* waitUntilPopupOpen(env);
			expect(yield* isPopupOpenEffect.pipe(Effect.provide(env))).toBe(true);
		}),
	);
});
