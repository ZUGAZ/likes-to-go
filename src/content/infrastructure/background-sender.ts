import { Context, Data, Effect, Layer } from 'effect';
import { sendToBackground } from '@/common/infrastructure/send-to-background';
import {
	CollectionCompleteRequest,
	CollectionErrorRequest,
	TracksBatchRequest,
} from '@/common/model/request-message';
import type { Track } from '@/common/model/track';

export class SendError extends Data.TaggedError('SendError')<{
	readonly reason: string;
}> {}

export interface BackgroundSender {
	readonly sendBatch: (
		tracks: readonly Track[],
	) => Effect.Effect<void, SendError>;
	readonly sendComplete: () => Effect.Effect<void, SendError>;
	readonly sendError: (message: string) => Effect.Effect<void, SendError>;
}

export class BackgroundSenderTag extends Context.Tag('BackgroundSender')<
	BackgroundSenderTag,
	BackgroundSender
>() {}

function wrapSend(promise: Promise<unknown>): Effect.Effect<void, SendError> {
	return Effect.tryPromise({
		try: () => promise,
		catch: (err) =>
			new SendError({
				reason: err instanceof Error ? err.message : String(err),
			}),
	}).pipe(Effect.asVoid);
}

export const BackgroundSenderLive: Layer.Layer<BackgroundSenderTag> =
	Layer.succeed(BackgroundSenderTag, {
		sendBatch: (tracks) =>
			wrapSend(sendToBackground(TracksBatchRequest({ tracks: [...tracks] }))),
		sendComplete: () => wrapSend(sendToBackground(CollectionCompleteRequest())),
		sendError: (message) =>
			wrapSend(sendToBackground(CollectionErrorRequest({ message }))),
	});
