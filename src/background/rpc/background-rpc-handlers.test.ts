import { describe, expect, it } from '@effect/vitest';
import * as RpcTest from '@effect/rpc/RpcTest';
import {
	Content,
	ExtensionPage,
	Popup,
	PortCaller,
} from 'browser-extension-kit/messaging';
import {
	Cause,
	Context,
	Deferred,
	Effect,
	Equal,
	Exit,
	Fiber,
	Layer,
	Option,
	Ref,
	Stream,
	SubscriptionRef,
} from 'effect';

import { dispatchEffect } from '@/background/background-dispatch';
import { CommandRunnerTag } from '@/background/command-runner';
import { DispatchLaneTag } from '@/background/dispatch-lane';
import {
	getMascotUiSurfaceEffect,
	ContentOverlaySurface,
	ExtensionPopupSurface,
} from '@/background/mascot-ui-surface';
import {
	OverlayHandoffAwaitingPopupClose,
	OverlayHandoffIdle,
	OverlayHandoffRefTag,
} from '@/background/overlay-handoff';
import { BackgroundRpcHandlersLive } from '@/background/rpc/background-rpc-handlers';
import { StateRefTag } from '@/background/state-ref';
import type { CollectionCommand } from '@/common/model/collection/command';
import { isCheckLogin } from '@/common/model/collection/commands/check-login';
import { isSelectCollectionTab } from '@/common/model/collection/commands/select-collection-tab';
import { CollectionTabSelected } from '@/common/model/collection/events/collection-tab-selected';
import { LoginVerified } from '@/common/model/collection/events/login-verified';
import { renderExportBody } from '@/common/model/export-format/render-export-body';
import {
	BackgroundRpcs,
	ExportUnavailable,
} from '@/common/model/messaging/background-rpcs';
import { Collecting } from '@/common/model/collection/states/collecting';
import { isCollecting } from '@/common/model/collection/states/collecting';
import { CollectingRequested } from '@/common/model/collection/states/collecting-requested';
import { Done, isDone } from '@/common/model/collection/states/done';
import { isErrorState } from '@/common/model/collection/states/error-state';
import { isIdle } from '@/common/model/collection/states/idle';
import { isPaused, Paused } from '@/common/model/collection/states/paused';
import { isSaving } from '@/common/model/collection/states/saving';
import { Saving } from '@/common/model/collection/states/saving';
import { makeBackgroundTestLayer } from '@/test/background-test-layer';
import type { CollectionState } from '@/common/model/collection/state';
import type { Endpoint } from 'browser-extension-kit/messaging';

const track = (name: string) => ({
	title: name,
	artist: 'Artist',
	url: new URL(`https://soundcloud.com/artist/${name}`),
});

const likes = Collecting({
	sourceUrl: 'https://soundcloud.com/you/likes',
	tabId: 7,
	tracks: [],
	skippedTrackCount: 0,
});

const handlerLayer = (options?: {
	readonly state?: CollectionState;
	readonly popupPresenceOpen?: boolean;
	readonly recorded?: Array<CollectionCommand>;
}) => {
	const recorded = options?.recorded ?? [];
	return BackgroundRpcHandlersLive.pipe(
		Layer.provideMerge(
			makeBackgroundTestLayer({
				...(options?.state === undefined ? {} : { state: options.state }),
				...(options?.popupPresenceOpen === undefined
					? {}
					: { popupPresenceOpen: options.popupPresenceOpen }),
				commandRunner: Layer.succeed(CommandRunnerTag, {
					run: (command) =>
						Effect.sync(() => {
							recorded.push(command);
						}),
				}),
			}),
		),
	);
};

const settle = (context: Context.Context<DispatchLaneTag>) =>
	DispatchLaneTag.pipe(
		Effect.flatMap((lane) => lane.submitAndAwait(Effect.void)),
		Effect.provide(context),
	);

const clientFor = (endpoint: Endpoint) =>
	RpcTest.makeClient(BackgroundRpcs).pipe(
		Effect.provide(Layer.succeed(PortCaller, () => Effect.succeed(endpoint))),
	);

describe('background rpc handlers', () => {
	it.scoped('maps event rpcs onto collection events', () =>
		Effect.gen(function* () {
			const recorded: Array<CollectionCommand> = [];
			const env = yield* Layer.build(handlerLayer({ recorded, state: likes }));
			const client = yield* clientFor(
				new Content({ tabId: 7, frameId: 0 }),
			).pipe(Effect.provide(env));
			yield* client.RefreshCollectionState();
			expect(recorded.map((command) => command._tag)).toEqual([]);
			const idleEnv = yield* Layer.build(handlerLayer({ recorded }));
			const idleClient = yield* clientFor(new Popup()).pipe(
				Effect.provide(idleEnv),
			);
			recorded.length = 0;
			yield* idleClient.RefreshCollectionState();
			yield* settle(idleEnv);
			expect(recorded.map((command) => command._tag)).toEqual([
				'CheckSource',
				'CheckLogin',
			]);

			const batchEnv = yield* Layer.build(handlerLayer({ state: likes }));
			const batchClient = yield* clientFor(
				new Content({ tabId: 7, frameId: 0 }),
			).pipe(Effect.provide(batchEnv));
			yield* batchClient.TracksBatch({
				tracks: [track('one')],
				skippedTrackCount: 0,
			});
			yield* settle(batchEnv);
			const afterBatch = yield* StateRefTag.pipe(
				Effect.flatMap(SubscriptionRef.get),
				Effect.provide(batchEnv),
			);
			expect(isCollecting(afterBatch) && afterBatch.tracks).toEqual([
				track('one'),
			]);

			yield* batchClient.CollectionComplete();
			yield* settle(batchEnv);
			const afterComplete = yield* StateRefTag.pipe(
				Effect.flatMap(SubscriptionRef.get),
				Effect.provide(batchEnv),
			);
			expect(isDone(afterComplete)).toBe(true);

			const savingEnv = yield* Layer.build(
				handlerLayer({
					state: Saving({ tracks: [track('one')], skippedTrackCount: 0 }),
				}),
			);
			const savingClient = yield* clientFor(new Popup()).pipe(
				Effect.provide(savingEnv),
			);
			yield* savingClient.DownloadFailed({
				message: 'disk',
				reason: 'full',
			});
			yield* settle(savingEnv);
			const afterFailed = yield* StateRefTag.pipe(
				Effect.flatMap(SubscriptionRef.get),
				Effect.provide(savingEnv),
			);
			expect(isDone(afterFailed)).toBe(true);

			const succeededEnv = yield* Layer.build(
				handlerLayer({
					state: Saving({ tracks: [track('one')], skippedTrackCount: 0 }),
				}),
			);
			const succeededClient = yield* clientFor(new Popup()).pipe(
				Effect.provide(succeededEnv),
			);
			yield* succeededClient.DownloadSucceeded();
			yield* settle(succeededEnv);
			expect(
				isIdle(
					yield* StateRefTag.pipe(
						Effect.flatMap(SubscriptionRef.get),
						Effect.provide(succeededEnv),
					),
				),
			).toBe(true);

			const cancelledEnv = yield* Layer.build(
				handlerLayer({
					state: Saving({ tracks: [track('one')], skippedTrackCount: 0 }),
				}),
			);
			const cancelledClient = yield* clientFor(new Popup()).pipe(
				Effect.provide(cancelledEnv),
			);
			yield* cancelledClient.DownloadCancelled();
			yield* settle(cancelledEnv);
			expect(
				isDone(
					yield* StateRefTag.pipe(
						Effect.flatMap(SubscriptionRef.get),
						Effect.provide(cancelledEnv),
					),
				),
			).toBe(true);

			const pausedEnv = yield* Layer.build(handlerLayer({ state: likes }));
			const pausedClient = yield* clientFor(
				new Content({ tabId: 7, frameId: 0 }),
			).pipe(Effect.provide(pausedEnv));
			yield* pausedClient.CollectionVisibilityPaused();
			yield* settle(pausedEnv);
			expect(
				isPaused(
					yield* StateRefTag.pipe(
						Effect.flatMap(SubscriptionRef.get),
						Effect.provide(pausedEnv),
					),
				),
			).toBe(true);

			const paused = Paused({
				sourceUrl: 'https://soundcloud.com/you/likes',
				tabId: 7,
				tracks: [track('one')],
				skippedTrackCount: 0,
			});
			const resumedEnv = yield* Layer.build(handlerLayer({ state: paused }));
			const resumedClient = yield* clientFor(
				new Content({ tabId: 7, frameId: 0 }),
			).pipe(Effect.provide(resumedEnv));
			yield* resumedClient.CollectionVisibilityResumed();
			yield* settle(resumedEnv);
			expect(
				isCollecting(
					yield* StateRefTag.pipe(
						Effect.flatMap(SubscriptionRef.get),
						Effect.provide(resumedEnv),
					),
				),
			).toBe(true);

			const errorEnv = yield* Layer.build(handlerLayer({ state: likes }));
			const errorClient = yield* clientFor(
				new Content({ tabId: 7, frameId: 0 }),
			).pipe(Effect.provide(errorEnv));
			yield* errorClient.CollectionError({
				message: 'the page stopped',
				reason: 'missing-root',
			});
			yield* settle(errorEnv);
			const errorState = yield* StateRefTag.pipe(
				Effect.flatMap(SubscriptionRef.get),
				Effect.provide(errorEnv),
			);
			expect(isErrorState(errorState) && errorState.reason).toBe(
				'collection-failed',
			);

			const loginEnv = yield* Layer.build(handlerLayer({ state: likes }));
			const loginClient = yield* clientFor(
				new Content({ tabId: 7, frameId: 0 }),
			).pipe(Effect.provide(loginEnv));
			yield* loginClient.LoginRequired({
				message: 'sign in',
				reason: 'no-cookie',
			});
			yield* settle(loginEnv);
			const loginState = yield* StateRefTag.pipe(
				Effect.flatMap(SubscriptionRef.get),
				Effect.provide(loginEnv),
			);
			expect(isErrorState(loginState) && loginState.reason).toBe(
				'login-required',
			);
		}),
	);

	it.scoped('claims a surface from popup-like callers only', () =>
		Effect.gen(function* () {
			const popupEnv = yield* Layer.build(handlerLayer());
			const popup = yield* clientFor(new Popup()).pipe(
				Effect.provide(popupEnv),
			);
			yield* popup.StartCollection();
			yield* settle(popupEnv);
			expect(
				yield* OverlayHandoffRefTag.pipe(
					Effect.flatMap(Ref.get),
					Effect.provide(popupEnv),
				),
			).toEqual(OverlayHandoffAwaitingPopupClose({}));
			expect(
				yield* getMascotUiSurfaceEffect().pipe(Effect.provide(popupEnv)),
			).toEqual(ExtensionPopupSurface());

			const pageEnv = yield* Layer.build(handlerLayer());
			const page = yield* clientFor(new ExtensionPage({ tabId: 3 })).pipe(
				Effect.provide(pageEnv),
			);
			yield* page.StartCollection();
			yield* settle(pageEnv);
			expect(
				yield* getMascotUiSurfaceEffect().pipe(Effect.provide(pageEnv)),
			).toEqual(ExtensionPopupSurface());

			const contentEnv = yield* Layer.build(handlerLayer());
			const content = yield* clientFor(
				new Content({ tabId: 7, frameId: 0 }),
			).pipe(Effect.provide(contentEnv));
			yield* content.StartCollection();
			yield* settle(contentEnv);
			expect(
				yield* OverlayHandoffRefTag.pipe(
					Effect.flatMap(Ref.get),
					Effect.provide(contentEnv),
				),
			).toEqual(OverlayHandoffIdle());
			expect(
				yield* getMascotUiSurfaceEffect().pipe(Effect.provide(contentEnv)),
			).toEqual(ContentOverlaySurface({ tabId: 7 }));

			for (const options of [{ popupPresenceOpen: true }]) {
				const blocked = yield* Layer.build(handlerLayer(options));
				const caller = yield* clientFor(
					new Content({ tabId: 7, frameId: 0 }),
				).pipe(Effect.provide(blocked));
				yield* caller.StartCollection();
				yield* settle(blocked);
				expect(
					yield* getMascotUiSurfaceEffect().pipe(Effect.provide(blocked)),
				).toEqual(ExtensionPopupSurface());
			}
		}),
	);

	it.scoped('cancel resets the handoff and claims the caller', () =>
		Effect.gen(function* () {
			const env = yield* Layer.build(handlerLayer());
			const client = yield* clientFor(new Popup()).pipe(Effect.provide(env));
			yield* client.StartCollection();
			yield* settle(env);
			yield* client.CancelCollection();
			yield* settle(env);
			expect(
				yield* OverlayHandoffRefTag.pipe(
					Effect.flatMap(Ref.get),
					Effect.provide(env),
				),
			).toEqual(OverlayHandoffIdle());
			expect(
				yield* getMascotUiSurfaceEffect().pipe(Effect.provide(env)),
			).toEqual(ExtensionPopupSurface());
		}),
	);

	it.scoped('returns export text only from a saving state', () =>
		Effect.gen(function* () {
			const tracks = [track('one'), track('two')];
			const env = yield* Layer.build(
				handlerLayer({
					state: Done({ tracks, skippedTrackCount: 0 }),
				}),
			);
			const client = yield* clientFor(new Popup()).pipe(Effect.provide(env));
			const json = yield* client.DownloadExport({ format: 'json' });
			const withoutExportedAt = (body: string) =>
				body.replace(/"exported_at":"[^"]*"/, '"exported_at":""');
			expect(withoutExportedAt(json)).toBe(
				withoutExportedAt(renderExportBody('json', tracks)),
			);
			const csvEnv = yield* Layer.build(
				handlerLayer({
					state: Done({ tracks, skippedTrackCount: 0 }),
				}),
			);
			const csvClient = yield* clientFor(new Popup()).pipe(
				Effect.provide(csvEnv),
			);
			expect(
				withoutExportedAt(yield* csvClient.DownloadExport({ format: 'csv' })),
			).toBe(withoutExportedAt(renderExportBody('csv', tracks)));
			const saving = yield* StateRefTag.pipe(
				Effect.flatMap(SubscriptionRef.get),
				Effect.provide(env),
			);
			expect(isSaving(saving)).toBe(true);

			const idleEnv = yield* Layer.build(handlerLayer());
			const idle = yield* clientFor(new Popup()).pipe(Effect.provide(idleEnv));
			const exit = yield* idle
				.DownloadExport({ format: 'json' })
				.pipe(Effect.exit);
			expect(Exit.isFailure(exit)).toBe(true);
			if (Exit.isFailure(exit)) {
				const failure = Cause.failureOption(exit.cause);
				expect(
					Option.isSome(failure) &&
						Equal.equals(
							failure.value,
							new ExportUnavailable({ status: 'idle' }),
						),
				).toBe(true);
			}
		}),
	);

	it.scoped('returns before a blocked lane except for download', () =>
		Effect.gen(function* () {
			const release = yield* Deferred.make<boolean>();
			const steps: Array<string> = [];
			const env = yield* Layer.build(
				BackgroundRpcHandlersLive.pipe(
					Layer.provideMerge(
						makeBackgroundTestLayer({
							commandRunner: Layer.succeed(CommandRunnerTag, {
								run: (command) =>
									Effect.gen(function* () {
										steps.push(command._tag);
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
						}),
					),
				),
			);
			const lane = yield* DispatchLaneTag.pipe(Effect.provide(env));
			yield* lane.submit(
				Deferred.await(release).pipe(
					Effect.andThen(
						Effect.sync(() => {
							steps.push('unblocked');
						}),
					),
				),
			);
			const client = yield* clientFor(new Popup()).pipe(Effect.provide(env));
			const started = yield* client.StartCollection().pipe(Effect.fork);
			const batched = yield* client
				.TracksBatch({ tracks: [track('one')], skippedTrackCount: 0 })
				.pipe(Effect.fork);
			const download = yield* client
				.DownloadExport({ format: 'json' })
				.pipe(Effect.fork);
			yield* Effect.yieldNow();
			expect(Option.isSome(yield* Fiber.poll(started))).toBe(true);
			expect(Option.isSome(yield* Fiber.poll(batched))).toBe(true);
			expect(Option.isNone(yield* Fiber.poll(download))).toBe(true);
			yield* Deferred.succeed(release, true);
			const downloadExit = yield* Fiber.join(download).pipe(Effect.exit);
			expect(Exit.isFailure(downloadExit)).toBe(true);
			expect(steps).toEqual([
				'unblocked',
				'CheckLogin',
				'SelectCollectionTab',
				'SendStartToTab',
			]);
			const state = yield* StateRefTag.pipe(
				Effect.flatMap(SubscriptionRef.get),
				Effect.provide(env),
			);
			expect(isCollecting(state) && state.tracks).toEqual([track('one')]);
		}),
	);

	it.scoped('marks only the collection tab', () =>
		Effect.gen(function* () {
			const env = yield* Layer.build(
				handlerLayer({ state: CollectingRequested() }),
			);
			const open = (endpoint: Endpoint) =>
				clientFor(endpoint).pipe(Effect.provide(env));
			const content = yield* open(new Content({ tabId: 7, frameId: 0 }));
			const other = yield* open(new Content({ tabId: 8, frameId: 0 }));
			const popup = yield* open(new Popup());
			const page = yield* open(new ExtensionPage({ tabId: 7 }));
			const first = yield* content
				.WatchCollectionState()
				.pipe(Stream.take(1), Stream.runHead);
			expect(Option.isSome(first) && first.value.isCollectionTab).toBe(false);
			yield* dispatchEffect(
				CollectionTabSelected({
					sourceUrl: 'https://soundcloud.com/you/likes',
					tabId: 7,
				}),
			).pipe(Effect.provide(env));
			const collection = yield* content
				.WatchCollectionState()
				.pipe(Stream.take(1), Stream.runHead);
			const elsewhere = yield* Effect.all([
				other.WatchCollectionState().pipe(Stream.take(1), Stream.runHead),
				popup.WatchCollectionState().pipe(Stream.take(1), Stream.runHead),
				page.WatchCollectionState().pipe(Stream.take(1), Stream.runHead),
			]);
			expect(
				Option.isSome(collection) && collection.value.isCollectionTab,
			).toBe(true);
			for (const view of elsewhere) {
				expect(Option.isSome(view) && view.value.isCollectionTab).toBe(false);
			}
		}),
	);
});
