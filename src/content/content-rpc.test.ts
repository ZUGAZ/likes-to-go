import { describe, expect, it } from '@effect/vitest';
import {
	Background,
	Content,
	isBackground,
	makeContentClient,
	PortConnector,
	PortPeers,
	Presence,
	withPortErrors,
} from 'browser-extension-kit/messaging';
import {
	makeFakePageLifecycle,
	makeFakePortHub,
} from 'browser-extension-kit/testing';
import {
	Context,
	Deferred,
	Effect,
	Equal,
	Exit,
	Fiber,
	HashMap,
	Layer,
	Option,
	Ref,
	Scope,
	Stream,
	SubscriptionRef,
	TestClock,
} from 'effect';
import { afterEach, vi } from 'vitest';

import { dispatchEffect } from '@/background/background-dispatch';
import { makeBackgroundLayer } from '@/background/background-layer';
import { CommandRunnerTag, runCommand } from '@/background/command-runner';
import { ContentCommandsTag } from '@/background/content-commands';
import { ContentCommandsRpc } from '@/background/infrastructure/content-commands-rpc';
import { StateRefTag } from '@/background/state-ref';
import { CollectionTabSelected } from '@/common/model/collection/events/collection-tab-selected';
import { Collecting } from '@/common/model/collection/states/collecting';
import { CollectingRequested } from '@/common/model/collection/states/collecting-requested';
import { isDone } from '@/common/model/collection/states/done';
import { isErrorState } from '@/common/model/collection/states/error-state';
import { BackgroundClientTag } from '@/common/infrastructure/background-client';
import { ContentRpcs } from '@/common/model/messaging/content-rpcs';
import { CONTENT_RPC_PORT_NAME } from '@/common/model/messaging/port-names';
import { BackgroundSenderTag } from '@/content/infrastructure/background-sender';
import { makeContentLayer } from '@/content/runtime/content-layer';
import { ContentLifetimeTag } from '@/content/runtime/content-lifetime';
import {
	CollectionBackendTag,
	type CollectionSnapshot,
} from '@/mascot/collection-backend';
import type { MascotVisibilityControls } from '@/mascot/visibility';
import { makeInMemoryStorage } from '@/test/background-test-layer';
import { makeCapturingLogger, silentLoggerLayer } from '@/test/effect-log-test';

const pipelineControl = vi.hoisted(() => ({
	takeWait: (): Effect.Effect<void> => Effect.never,
}));

vi.mock(
	'@/content/infrastructure/collection-services',
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import('@/content/infrastructure/collection-services')
			>();
		const { Effect: EffectNs, Layer: LayerNs } = await import('effect');
		return {
			...actual,
			makeCollectionLive: () =>
				LayerNs.mergeAll(
					LayerNs.succeed(actual.DomScannerTag, {
						scanBatch: () =>
							EffectNs.flatMap(
								EffectNs.sync(() => pipelineControl.takeWait()),
								(wait) =>
									wait.pipe(
										EffectNs.as({
											batch: {
												tracks: [],
												parsedCount: 0,
												skippedCount: 0,
												totalValidCount: 0,
												noNewCards: true,
											},
											nextState: {
												previousValidCount: 0,
												totalParsedCount: 0,
												totalSkippedCount: 0,
											},
										}),
									),
							),
						isLoadingIndicatorPresent: () => EffectNs.succeed(false),
						isErrorIndicatorPresent: () => EffectNs.succeed(false),
						clickRetry: () => EffectNs.void,
					}),
					LayerNs.succeed(actual.ScrollerTag, {
						scrollToBottom: () => EffectNs.void,
					}),
					LayerNs.succeed(actual.DocumentVisibilityTag, {
						isHidden: () => EffectNs.succeed(false),
					}),
				),
		};
	},
);

const tab = (tabId: number) => new Content({ tabId, frameId: 0 });

const track = (name: string) => ({
	title: name,
	artist: 'Artist',
	url: new URL(`https://soundcloud.com/artist/${name}`),
});

const collectingOn = (tabId: number) =>
	Collecting({
		sourceUrl: 'https://soundcloud.com/you/likes',
		tabId,
		tracks: [],
		skippedTrackCount: 0,
	});

const idleVisibility = (): MascotVisibilityControls => ({
	isVisible: () => false,
	summon: () => undefined,
	dismiss: () => undefined,
	toggle: () => undefined,
});

const settle = Effect.gen(function* () {
	for (let step = 0; step < 20; step += 1) {
		yield* Effect.yieldNow();
	}
});

const countConnects = (connects: Ref.Ref<number>) =>
	Layer.effect(
		PortConnector,
		Effect.gen(function* () {
			const connector = yield* PortConnector;
			return {
				connect: (
					target: Parameters<PortConnector['Type']['connect']>[0],
					name: string,
				) =>
					Ref.update(connects, (count) => count + 1).pipe(
						Effect.andThen(connector.connect(target, name)),
					),
				listen: (name: string) => connector.listen(name),
			};
		}),
	);

const loginRequiredDom = (): void => {
	document.body.innerHTML = [
		'<div class="lazyLoadingList__list">',
		'<div class="badgeList__item">card</div>',
		'</div>',
	].join('');
};

const supportedLikesDom = (): void => {
	document.body.innerHTML = [
		'<div class="header__userNav">User Menu</div>',
		'<div class="lazyLoadingList__list">',
		'<div class="badgeList__item">card</div>',
		'</div>',
	].join('');
};

const backgroundFor = (
	hub: Effect.Effect.Success<typeof makeFakePortHub>,
	stored?: ReturnType<typeof collectingOn> | CollectingRequested,
) =>
	makeBackgroundLayer({
		portConnector: hub.layerFor(new Background()),
		storage: makeInMemoryStorage(stored === undefined ? {} : { stored }),
		commandRunner: Layer.succeed(CommandRunnerTag, { run: runCommand }),
		contentCommands: ContentCommandsRpc,
		logger: silentLoggerLayer,
	});

const waitForPresence = (env: Context.Context<Presence>, endpoint: Content) =>
	Effect.gen(function* () {
		const presence = yield* Presence;
		for (let attempt = 0; attempt < 40; attempt += 1) {
			if (HashMap.has(yield* presence.get, endpoint)) {
				return;
			}
			yield* Effect.yieldNow();
		}
		return yield* Effect.die('content presence did not open');
	}).pipe(Effect.provide(env));

describe('content rpc', () => {
	afterEach(() => {
		document.documentElement.innerHTML = '';
		pipelineControl.takeWait = () => Effect.never;
	});

	it.scoped('serves background commands and classifies the peer', () =>
		Effect.gen(function* () {
			loginRequiredDom();
			const hub = yield* makeFakePortHub;
			const lifecycle = yield* makeFakePageLifecycle;
			const visible = { current: false };
			const visibility: MascotVisibilityControls = {
				isVisible: () => visible.current,
				summon: () => {
					visible.current = true;
				},
				dismiss: () => {
					visible.current = false;
				},
				toggle: () => {
					visible.current = !visible.current;
				},
			};
			const frame = tab(7);
			const env = yield* Layer.build(backgroundFor(hub));
			const content = yield* Layer.build(
				makeContentLayer({
					visibility,
					portConnector: hub.layerFor(frame),
					pageLifecycle: lifecycle.layer,
					logger: silentLoggerLayer,
				}),
			);
			yield* waitForPresence(env, frame);
			yield* ContentCommandsTag.pipe(
				Effect.flatMap((commands) => commands.startPageCollection(7)),
				Effect.provide(env),
			);
			const peers = Context.get(content, PortPeers);
			const current = yield* peers.changes.pipe(Stream.take(1), Stream.runHead);
			expect(Option.isSome(current)).toBe(true);
			if (Option.isSome(current)) {
				expect(
					HashMap.toEntries(current.value).some(([, peer]) =>
						isBackground(peer),
					),
				).toBe(true);
			}
			const commands = yield* ContentCommandsTag.pipe(Effect.provide(env));
			yield* commands.toggleMascot(7);
			expect(visible.current).toBe(true);
			visible.current = false;
			yield* commands.showMascot(7);
			expect(visible.current).toBe(true);
		}),
	);

	it.scoped('keeps the pipeline running after the caller port closes', () =>
		Effect.gen(function* () {
			supportedLikesDom();
			const hub = yield* makeFakePortHub;
			const lifecycle = yield* makeFakePageLifecycle;
			const frame = tab(7);
			const env = yield* Layer.build(backgroundFor(hub));
			yield* Layer.build(
				makeContentLayer({
					visibility: idleVisibility(),
					portConnector: hub.layerFor(frame),
					pageLifecycle: lifecycle.layer,
					logger: silentLoggerLayer,
				}),
			);
			yield* waitForPresence(env, frame);
			const started = yield* Deferred.make<undefined>();
			const block = yield* Deferred.make<undefined>();
			let interruptions = 0;
			pipelineControl.takeWait = () =>
				Deferred.succeed(started, undefined).pipe(
					Effect.zipRight(Deferred.await(block)),
					Effect.onInterrupt(() =>
						Effect.sync(() => {
							interruptions += 1;
						}),
					),
				);
			const callScope = yield* Scope.make();
			const client = yield* makeContentClient(ContentRpcs, {
				name: CONTENT_RPC_PORT_NAME,
				target: frame,
			}).pipe(
				Effect.provide(hub.layerFor(new Background())),
				Effect.provide(silentLoggerLayer),
				Scope.extend(callScope),
			);
			const rpcFiber = yield* client
				.StartPageCollection()
				.pipe(withPortErrors(), Effect.fork);
			yield* Deferred.await(started);
			yield* settle;
			const polled = yield* Fiber.poll(rpcFiber);
			expect(Option.isSome(polled)).toBe(true);
			if (Option.isSome(polled)) {
				expect(Exit.isSuccess(polled.value)).toBe(true);
			}
			yield* Scope.close(callScope, Exit.void);
			yield* settle;
			expect(interruptions).toBe(0);
			yield* ContentCommandsTag.pipe(
				Effect.flatMap((commands) => commands.cancelPageCollection(7)),
				Effect.provide(env),
			);
			expect(interruptions).toBe(1);
		}),
	);

	it.scoped('keeps isCollectionTab off the overlay snapshot', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const lifecycle = yield* makeFakePageLifecycle;
			const env = yield* Layer.build(backgroundFor(hub, collectingOn(7)));
			const openContent = (tabId: number) =>
				Layer.build(
					makeContentLayer({
						visibility: idleVisibility(),
						portConnector: hub.layerFor(tab(tabId)),
						pageLifecycle: lifecycle.layer,
						logger: silentLoggerLayer,
					}),
				);
			const onTab = yield* openContent(7);
			const elsewhere = yield* openContent(8);
			yield* waitForPresence(env, tab(7));
			yield* waitForPresence(env, tab(8));
			const watchCollecting = (context: typeof onTab) => {
				const { client } = Context.get(context, BackgroundClientTag);
				return client.WatchCollectionState().pipe(
					Stream.filter((view) => view.status === 'collecting'),
					Stream.runHead,
				);
			};
			const onCollectionTab = yield* watchCollecting(onTab);
			const onOtherTab = yield* watchCollecting(elsewhere);
			expect(
				Option.isSome(onCollectionTab) && onCollectionTab.value.isCollectionTab,
			).toBe(true);
			expect(
				Option.isSome(onOtherTab) && onOtherTab.value.isCollectionTab,
			).toBe(false);
			const snapshot: Option.Option<CollectionSnapshot> = yield* Context.get(
				onTab,
				CollectionBackendTag,
			).collectionUpdates.pipe(
				Stream.filter((view) => view.status === 'collecting'),
				Stream.runHead,
			);
			expect(Option.isSome(snapshot)).toBe(true);
			if (Option.isSome(snapshot)) {
				expect(snapshot.value.status).toBe('collecting');
				expect(Object.hasOwn(snapshot.value, 'isCollectionTab')).toBe(false);
			}
		}),
	);

	it.scoped('applies discarded batches in send order', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const lifecycle = yield* makeFakePageLifecycle;
			const frame = tab(7);
			const env = yield* Layer.build(backgroundFor(hub, collectingOn(7)));
			const content = yield* Layer.build(
				makeContentLayer({
					visibility: idleVisibility(),
					portConnector: hub.layerFor(frame),
					pageLifecycle: lifecycle.layer,
					logger: silentLoggerLayer,
				}),
			);
			yield* waitForPresence(env, frame);
			const sender = Context.get(content, BackgroundSenderTag);
			for (const name of ['a', 'b', 'c']) {
				yield* sender.sendBatch({
					tracks: [track(name)],
					skippedTrackCount: 0,
				});
			}
			yield* sender.sendComplete();
			yield* settle;
			const state = yield* StateRefTag.pipe(
				Effect.flatMap(SubscriptionRef.get),
				Effect.provide(env),
			);
			expect(isDone(state) && state.tracks.map((item) => item.title)).toEqual([
				'a',
				'b',
				'c',
			]);
		}),
	);

	it.scoped('holds a discard send while the page is cached', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const lifecycle = yield* makeFakePageLifecycle;
			const connects = yield* Ref.make(0);
			const frame = tab(7);
			const env = yield* Layer.build(backgroundFor(hub, collectingOn(7)));
			const content = yield* Layer.build(
				makeContentLayer({
					visibility: idleVisibility(),
					portConnector: countConnects(connects).pipe(
						Layer.provide(hub.layerFor(frame)),
					),
					pageLifecycle: lifecycle.layer,
					logger: silentLoggerLayer,
				}),
			);
			yield* waitForPresence(env, frame);
			const before = yield* Ref.get(connects);
			const lifetime = Context.get(content, ContentLifetimeTag);
			const stopped = yield* lifetime.stopped.pipe(Effect.fork);
			yield* lifecycle.enterCache;
			yield* hub.enterBackForwardCache(frame);
			const sent = yield* Context.get(content, BackgroundSenderTag)
				.sendBatch({ tracks: [track('cached')], skippedTrackCount: 0 })
				.pipe(Effect.fork);
			yield* TestClock.adjust('1 minute');
			yield* settle;
			expect(Option.isNone(yield* Fiber.poll(sent))).toBe(true);
			expect(yield* Ref.get(connects)).toBe(before);
			yield* lifecycle.restore;
			yield* settle;
			expect(Exit.isSuccess(yield* Fiber.join(sent).pipe(Effect.exit))).toBe(
				true,
			);
			expect(Option.isNone(yield* Fiber.poll(stopped))).toBe(true);
		}),
	);

	it.scoped('stops the content lifetime when the extension context ends', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const lifecycle = yield* makeFakePageLifecycle;
			const frame = tab(7);
			const removed = yield* Ref.make(false);
			const done = yield* Effect.gen(function* () {
				yield* Layer.build(backgroundFor(hub));
				const content = yield* Layer.build(
					makeContentLayer({
						visibility: idleVisibility(),
						portConnector: hub.layerFor(frame),
						pageLifecycle: lifecycle.layer,
						logger: silentLoggerLayer,
					}),
				);
				yield* Effect.addFinalizer(() => Ref.set(removed, true));
				for (let step = 0; step < 40; step += 1) {
					const ports = yield* hub.openPorts;
					if (ports.some((port) => Equal.equals(port.from, frame))) {
						break;
					}
					yield* Effect.yieldNow();
				}
				yield* hub.invalidateExtensionContext(frame);
				yield* Context.get(content, ContentLifetimeTag).stopped;
			}).pipe(Effect.scoped, Effect.fork);
			yield* Fiber.join(done);
			expect(yield* Ref.get(removed)).toBe(true);
		}),
	);

	it.scoped('fails an absent tab through the production command path', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const logger = makeCapturingLogger();
			const env = yield* Layer.build(
				makeBackgroundLayer({
					portConnector: hub.layerFor(new Background()),
					storage: makeInMemoryStorage({ stored: CollectingRequested() }),
					commandRunner: Layer.succeed(CommandRunnerTag, { run: runCommand }),
					contentCommands: ContentCommandsRpc,
					logger: logger.layer,
				}),
			);
			Object.defineProperty(globalThis, 'chrome', {
				configurable: true,
				writable: true,
				value: {
					tabs: {
						update: () => Promise.resolve({ windowId: 1 }),
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
			yield* TestClock.adjust('2999 millis');
			expect(Option.isNone(yield* Fiber.poll(fiber))).toBe(true);
			yield* TestClock.adjust('1 millis');
			yield* Fiber.join(fiber);
			const state = yield* StateRefTag.pipe(
				Effect.flatMap(SubscriptionRef.get),
				Effect.provide(env),
			);
			expect(isErrorState(state)).toBe(true);
			if (isErrorState(state)) {
				expect(state.message).toBe('Could not open or talk to the likes page');
				expect(state.reason).toBe('collection-failed');
			}
			expect(
				logger
					.messages()
					.some((message) =>
						JSON.stringify(message).includes('ReceiverUnavailable'),
					),
			).toBe(true);
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
});
