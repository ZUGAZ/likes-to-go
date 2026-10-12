import { describe, expect, it } from '@effect/vitest';
import {
	Background,
	Disconnected,
	ExtensionContextInvalidated,
	ExtensionPage,
	PageLifecycleNone,
	Popup,
	Timeout,
	type Endpoint,
} from 'browser-extension-kit/messaging';
import { makeFakePortHub } from 'browser-extension-kit/testing';
import {
	Context,
	Effect,
	Exit,
	Layer,
	Option,
	Queue,
	Schema,
	Scope,
	Stream,
	SubscriptionRef,
	TestClock,
} from 'effect';

import { dispatchEffect } from '@/background/background-dispatch';
import { makeBackgroundLayer } from '@/background/background-layer';
import { CommandRunnerTag } from '@/background/command-runner';
import { DispatchLaneTag } from '@/background/dispatch-lane';
import {
	ContentOverlaySurface,
	getMascotUiSurfaceEffect,
} from '@/background/mascot-ui-surface';
import { isPopupOpenEffect } from '@/background/overlay-handoff';
import { StateRefTag } from '@/background/state-ref';
import type { CollectionCommand } from '@/common/model/collection/command';
import { isCheckLogin } from '@/common/model/collection/commands/check-login';
import { isSelectCollectionTab } from '@/common/model/collection/commands/select-collection-tab';
import type { CollectionState } from '@/common/model/collection/state';
import { CollectionTabSelected } from '@/common/model/collection/events/collection-tab-selected';
import { LoginVerified } from '@/common/model/collection/events/login-verified';
import { isCollecting } from '@/common/model/collection/states/collecting';
import { Done } from '@/common/model/collection/states/done';
import { renderExportBody } from '@/common/model/export-format/render-export-body';
import { BackgroundClientLive } from '@/common/infrastructure/background-client';
import { ExportUnavailable } from '@/common/model/messaging/background-rpcs';
import {
	CollectionBackendTag,
	type CollectionSnapshot,
} from '@/mascot/collection-backend';
import {
	CollectionBackendRpc,
	portErrorReason,
} from '@/mascot/infrastructure/collection-backend-rpc';
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

const doneState = Done({
	tracks: [track('one'), track('two')],
	skippedTrackCount: 0,
});

const isExportUnavailable = Schema.is(ExportUnavailable);

const settle = Effect.gen(function* () {
	for (let step = 0; step < 40; step += 1) {
		yield* Effect.yieldNow();
	}
});

const clientLayer = (
	hub: Effect.Effect.Success<typeof makeFakePortHub>,
	endpoint: Endpoint,
) =>
	CollectionBackendRpc.pipe(
		Layer.provide(BackgroundClientLive),
		Layer.provide(Layer.mergeAll(hub.layerFor(endpoint), PageLifecycleNone)),
		Layer.provideMerge(silentLoggerLayer),
	);

const backgroundFor = (
	hub: Effect.Effect.Success<typeof makeFakePortHub>,
	options?: {
		readonly stored?: CollectionState;
		readonly recorded?: Array<CollectionCommand>;
	},
) =>
	makeBackgroundLayer({
		portConnector: hub.layerFor(new Background()),
		storage: makeInMemoryStorage(
			options?.stored === undefined ? {} : { stored: options.stored },
		),
		commandRunner: Layer.succeed(CommandRunnerTag, {
			run: (command) =>
				Effect.sync(() => {
					options?.recorded?.push(command);
				}),
		}),
		contentCommands: makeRecordingContentCommands().layer,
		logger: silentLoggerLayer,
	});

const openBackend = (
	hub: Effect.Effect.Success<typeof makeFakePortHub>,
	endpoint: Endpoint,
) =>
	Layer.build(clientLayer(hub, endpoint)).pipe(
		Effect.map((context) => Context.get(context, CollectionBackendTag)),
	);

const collect = (updates: Stream.Stream<CollectionSnapshot, unknown>) =>
	Effect.gen(function* () {
		const received = yield* Queue.unbounded<CollectionSnapshot>();
		yield* updates.pipe(
			Stream.runForEach((snapshot) =>
				Queue.offer(received, snapshot).pipe(Effect.asVoid),
			),
			Effect.forkScoped,
		);
		for (let step = 0; step < 5; step += 1) {
			yield* Effect.yieldNow();
		}
		return received;
	});

const takeSnapshot = (received: Queue.Queue<CollectionSnapshot>) =>
	Queue.take(received);

describe('portErrorReason', () => {
	it.effect('formats disconnected, timeout, and invalidated errors', () =>
		Effect.sync(() => {
			expect(portErrorReason(new Disconnected({ detail: 'x' }))).toBe(
				'Disconnected: x',
			);
			expect(portErrorReason(new Disconnected({}))).toBe('Disconnected');
			expect(portErrorReason(new Timeout({ afterMillis: 10 }))).toBe('Timeout');
			expect(portErrorReason(new ExtensionContextInvalidated())).toBe(
				'ExtensionContextInvalidated',
			);
		}),
	);
});

describe('CollectionBackendRpc', () => {
	it.scoped(
		'streams idle then checking-login for a popup and an extension page',
		() =>
			Effect.forEach(
				[new Popup(), new ExtensionPage({ tabId: 4 })] as const,
				(endpoint) =>
					Effect.gen(function* () {
						const hub = yield* makeFakePortHub;
						yield* Layer.build(backgroundFor(hub));
						const backend = yield* openBackend(hub, endpoint);
						const received = yield* collect(backend.collectionUpdates);
						expect((yield* Queue.take(received)).status).toBe('idle');
						expect(yield* backend.startCollection).toBeUndefined();
						expect((yield* Queue.take(received)).status).toBe('checking-login');
					}),
			),
		15_000,
	);

	it.scoped('both open surfaces see the same transition', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			yield* Layer.build(backgroundFor(hub));
			const popup = yield* openBackend(hub, new Popup());
			const page = yield* openBackend(hub, new ExtensionPage({ tabId: 4 }));
			const popupUpdates = yield* collect(popup.collectionUpdates);
			const pageUpdates = yield* collect(page.collectionUpdates);
			expect((yield* takeSnapshot(popupUpdates)).status).toBe('idle');
			expect((yield* takeSnapshot(pageUpdates)).status).toBe('idle');
			yield* popup.startCollection;
			expect((yield* takeSnapshot(popupUpdates)).status).toBe('checking-login');
			expect((yield* takeSnapshot(pageUpdates)).status).toBe('checking-login');
		}),
	);

	it.scoped('keeps the last view across a service-worker stop', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const env = yield* Layer.build(backgroundFor(hub));
			const backend = yield* openBackend(hub, new Popup());
			const received = yield* collect(backend.collectionUpdates);
			expect((yield* takeSnapshot(received)).status).toBe('idle');
			yield* TestClock.adjust('2 seconds');
			yield* settle;
			yield* hub.stopServiceWorker;
			yield* settle;
			const duringReconnect = yield* Queue.poll(received);
			if (Option.isSome(duringReconnect)) {
				expect(duringReconnect.value.status).toBe('idle');
			}
			const stateRef = yield* StateRefTag.pipe(Effect.provide(env));
			yield* SubscriptionRef.set(stateRef, doneState);
			yield* TestClock.adjust('1 second');
			yield* settle;
			const next = yield* takeSnapshot(received);
			expect(next.status).toBe('done');
			expect(next.trackCount).toBe(2);
		}),
	);

	it.scoped('downloadExport fails in idle and returns the file in done', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			yield* Layer.build(backgroundFor(hub));
			const idleBackend = yield* openBackend(hub, new Popup());
			const idleError = yield* idleBackend
				.downloadExport('json')
				.pipe(Effect.flip);
			expect(isExportUnavailable(idleError) && idleError.status).toBe('idle');

			const doneHub = yield* makeFakePortHub;
			yield* Layer.build(backgroundFor(doneHub, { stored: doneState }));
			const doneBackend = yield* openBackend(doneHub, new Popup());
			const body = yield* doneBackend.downloadExport('json');
			const rendered = renderExportBody('json', doneState.tracks);
			const withoutExportedAt = (text: string) =>
				text.replace(/"exported_at":"[^"]+"/, '"exported_at":""');
			expect(withoutExportedAt(body)).toBe(withoutExportedAt(rendered));
		}),
	);

	it.scoped('refresh checks source and login', () =>
		Effect.gen(function* () {
			const hub = yield* makeFakePortHub;
			const recorded: Array<CollectionCommand> = [];
			const env = yield* Layer.build(backgroundFor(hub, { recorded }));
			const backend = yield* openBackend(hub, new Popup());
			yield* backend.refresh;
			yield* DispatchLaneTag.pipe(
				Effect.flatMap((lane) => lane.submitAndAwait(Effect.void)),
				Effect.provide(env),
			);
			expect(recorded.map((command) => command._tag)).toEqual([
				'CheckSource',
				'CheckLogin',
			]);
		}),
	);

	it.scoped('presence closes with the client and schedules the overlay', () =>
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
			const clientScope = yield* Scope.make();
			yield* Layer.build(clientLayer(hub, new Popup())).pipe(
				Effect.flatMap(
					(context) =>
						Context.get(context, CollectionBackendTag).startCollection,
				),
				Scope.extend(clientScope),
			);
			yield* Effect.gen(function* () {
				for (let attempt = 0; attempt < 40; attempt += 1) {
					if (yield* isPopupOpenEffect.pipe(Effect.provide(env))) {
						return;
					}
					yield* Effect.yieldNow();
				}
				return yield* Effect.die('popup presence did not open');
			});
			yield* StateRefTag.pipe(
				Effect.flatMap((ref) =>
					ref.changes.pipe(Stream.filter(isCollecting), Stream.runHead),
				),
				Effect.provide(env),
			);
			yield* Scope.close(clientScope, Exit.void);
			yield* Effect.gen(function* () {
				for (let attempt = 0; attempt < 40; attempt += 1) {
					if (!(yield* isPopupOpenEffect.pipe(Effect.provide(env)))) {
						return;
					}
					yield* Effect.yieldNow();
				}
				return yield* Effect.die('popup presence did not close');
			});
			yield* TestClock.adjust('100 millis');
			expect(commands.calls()).toEqual([{ command: 'showMascot', tabId: 1 }]);
			expect(
				yield* getMascotUiSurfaceEffect().pipe(Effect.provide(env)),
			).toEqual(ContentOverlaySurface({ tabId: 1 }));
		}),
	);
});
