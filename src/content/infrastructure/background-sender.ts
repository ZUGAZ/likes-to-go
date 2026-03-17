import { Context, Effect, Layer } from 'effect';
import {
	SendToBackgroundFailed,
	sendToBackgroundEffect,
} from '@/common/infrastructure/send-to-background';
import {
	CollectionCompleteRequest,
	CollectionErrorRequest,
	TracksBatchRequest,
} from '@/common/model/request-message';
import type { Track } from '@/common/model/track';

export interface TracksBatchPayload {
	readonly tracks: readonly Track[];
	readonly skippedTrackCount: number;
}

export interface BackgroundSender {
	readonly sendBatch: (
		args: TracksBatchPayload,
	) => Effect.Effect<void, SendToBackgroundFailed>;
	readonly sendComplete: () => Effect.Effect<void, SendToBackgroundFailed>;
	readonly sendError: (
		message: string,
		reason: string,
	) => Effect.Effect<void, SendToBackgroundFailed>;
}

export class BackgroundSenderTag extends Context.Tag('BackgroundSender')<
	BackgroundSenderTag,
	BackgroundSender
>() {}

export const BackgroundSenderLive: Layer.Layer<BackgroundSenderTag> =
	Layer.succeed(BackgroundSenderTag, {
		sendBatch: ({ tracks, skippedTrackCount }) =>
			sendToBackgroundEffect(
				TracksBatchRequest({ tracks: [...tracks], skippedTrackCount }),
			).pipe(Effect.asVoid),
		sendComplete: () =>
			sendToBackgroundEffect(CollectionCompleteRequest()).pipe(Effect.asVoid),
		sendError: (message, reason) =>
			sendToBackgroundEffect(CollectionErrorRequest({ message, reason })).pipe(
				Effect.asVoid,
			),
	});
