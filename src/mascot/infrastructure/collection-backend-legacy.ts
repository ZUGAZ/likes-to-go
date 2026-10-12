import { decodeGetStateResponse } from '@/common/infrastructure/get-state';
import { getState } from '@/common/infrastructure/get-state';
import { listenForStateUpdatesEffect } from '@/common/infrastructure/listen-for-state-updates';
import { sendToBackgroundEffect } from '@/common/infrastructure/send-to-background';
import type { BackgroundRequestMessage } from '@/common/model/request-message';
import {
	CancelCollectionRequest,
	DownloadCancelledRequest,
	DownloadExportRequest,
	DownloadFailedRequest,
	DownloadSucceededRequest,
	StartCollectionRequest,
} from '@/common/model/request-message';
import {
	BackgroundUnreachable,
	CollectionBackendTag,
	type CollectionSnapshot,
	type DownloadFailure,
} from '@/mascot/collection-backend';
import { Effect, Layer, PubSub, Stream } from 'effect';

const toUnreachable = (error: { readonly reason: string }) =>
	new BackgroundUnreachable({ reason: error.reason });

/**
 * Content overlay only, until content moves to the background port.
 * Do not use it in new code.
 */
export const CollectionBackendLegacy: Layer.Layer<CollectionBackendTag> =
	Layer.scoped(
		CollectionBackendTag,
		Effect.gen(function* () {
			const updates = yield* PubSub.unbounded<CollectionSnapshot>();
			const publish = (snapshot: CollectionSnapshot) =>
				PubSub.publish(updates, snapshot).pipe(Effect.asVoid);

			const stop = yield* listenForStateUpdatesEffect((payload) => {
				Effect.runSync(publish(payload));
			});
			yield* Effect.addFinalizer(() => Effect.sync(stop));

			const reply = (message: BackgroundRequestMessage) =>
				sendToBackgroundEffect(message).pipe(
					Effect.flatMap(decodeGetStateResponse),
					Effect.tap(publish),
				);

			return {
				collectionUpdates: Stream.fromPubSub(updates),
				refresh: getState().pipe(Effect.flatMap(publish)),
				startCollection: reply(StartCollectionRequest()).pipe(
					Effect.asVoid,
					Effect.catchTag('DecodeGetStateResponseFailed', (error) =>
						Effect.logWarning(
							'startCollection background responded with unexpected payload',
							error.reason,
						),
					),
					Effect.mapError(toUnreachable),
				),
				cancelCollection: sendToBackgroundEffect(
					CancelCollectionRequest(),
				).pipe(Effect.asVoid, Effect.mapError(toUnreachable)),
				downloadExport: (format) =>
					reply(DownloadExportRequest({ format })).pipe(
						Effect.map((response) => response.exportBody ?? ''),
						Effect.mapError(toUnreachable),
					),
				downloadSucceeded: reply(DownloadSucceededRequest()).pipe(
					Effect.asVoid,
					Effect.mapError(toUnreachable),
				),
				downloadCancelled: reply(DownloadCancelledRequest()).pipe(
					Effect.asVoid,
					Effect.mapError(toUnreachable),
				),
				downloadFailed: (failure: DownloadFailure) =>
					reply(DownloadFailedRequest(failure)).pipe(
						Effect.asVoid,
						Effect.mapError(toUnreachable),
					),
			};
		}),
	);
