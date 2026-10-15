import {
	BackgroundClientLive,
	BackgroundClientTag,
} from '@/common/infrastructure/background-client';
import { BackgroundSenderLive } from '@/content/infrastructure/background-sender';
import { ContentPeerLogLive } from '@/content/content-peer-log';
import { ContentRpcServerLive } from '@/content/content-rpc-handlers';
import { MascotControlsTag } from '@/content/mascot-controls';
import { PageCollectionLive } from '@/content/page-collection';
import {
	ContentLifetimeLive,
	ContentLifetimeTag,
} from '@/content/runtime/content-lifetime';
import { CollectionBackendRpc } from '@/mascot/infrastructure/collection-backend-rpc';
import {
	CollectionBackendTag,
	type CollectionSnapshot,
} from '@/mascot/collection-backend';
import type { MascotVisibilityControls } from '@/mascot/visibility';
import {
	ClientConnection,
	type PageLifecycle,
	type PortConnector,
} from 'browser-extension-kit/messaging';
import { Effect, Layer, Stream } from 'effect';

const ContentLifetimeWatcherLive: Layer.Layer<
	never,
	never,
	BackgroundClientTag | ContentLifetimeTag
> = Layer.scopedDiscard(
	Effect.gen(function* () {
		const { connection } = yield* BackgroundClientTag;
		const lifetime = yield* ContentLifetimeTag;
		yield* connection.pipe(
			Stream.runForEach((status) =>
				ClientConnection.$match(status, {
					Connecting: () => Effect.void,
					Connected: () => Effect.void,
					Terminated: ({ error }) =>
						Effect.logWarning('background client terminated', error).pipe(
							Effect.andThen(lifetime.stop),
						),
				}),
			),
			Effect.withLogSpan('ContentLifetime'),
			Effect.forkScoped,
		);
	}),
);

/** Drops caller-only fields so the overlay snapshot matches `CollectionSnapshot`. */
const contentCollectionBackend = Layer.effect(
	CollectionBackendTag,
	Effect.gen(function* () {
		const backend = yield* CollectionBackendTag;
		return {
			...backend,
			collectionUpdates: backend.collectionUpdates.pipe(
				Stream.map(
					(view): CollectionSnapshot => ({
						status: view.status,
						trackCount: view.trackCount,
						...(view.message === undefined ? {} : { message: view.message }),
						...(view.skippedTrackCount === undefined
							? {}
							: { skippedTrackCount: view.skippedTrackCount }),
						...(view.source === undefined ? {} : { source: view.source }),
					}),
				),
			),
		};
	}),
).pipe(Layer.provide(CollectionBackendRpc));

export function makeContentLayer(deps: {
	readonly visibility: MascotVisibilityControls;
	readonly portConnector: Layer.Layer<PortConnector>;
	readonly pageLifecycle: Layer.Layer<PageLifecycle>;
	readonly logger: Layer.Layer<never>;
}) {
	const platform = Layer.mergeAll(deps.portConnector, deps.pageLifecycle).pipe(
		Layer.provideMerge(deps.logger),
	);
	const controls = Layer.succeed(MascotControlsTag, deps.visibility);
	const shared = Layer.mergeAll(
		BackgroundClientLive,
		ContentLifetimeLive,
		controls,
	).pipe(Layer.provideMerge(platform));
	const withSender = Layer.mergeAll(
		BackgroundSenderLive,
		contentCollectionBackend,
		ContentLifetimeWatcherLive,
	).pipe(Layer.provideMerge(shared));
	const withPage = PageCollectionLive.pipe(Layer.provideMerge(withSender));
	const withServer = ContentRpcServerLive.pipe(Layer.provideMerge(withPage));

	return ContentPeerLogLive.pipe(Layer.provideMerge(withServer));
}
