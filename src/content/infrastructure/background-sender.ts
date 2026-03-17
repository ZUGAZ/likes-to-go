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

export interface BackgroundSender {
	readonly sendBatch: (
		tracks: readonly Track[],
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
		sendBatch: (tracks) =>
			sendToBackgroundEffect(TracksBatchRequest({ tracks: [...tracks] })).pipe(
				Effect.asVoid,
			),
		sendComplete: () =>
			sendToBackgroundEffect(CollectionCompleteRequest()).pipe(Effect.asVoid),
		sendError: (message, reason) =>
			sendToBackgroundEffect(CollectionErrorRequest({ message, reason })).pipe(
				Effect.asVoid,
			),
	});
