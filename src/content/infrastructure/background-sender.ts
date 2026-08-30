import { Context, Effect, Layer } from 'effect';
import { SendToBackgroundFailed } from '@/common/infrastructure/send-to-background';
import {
	CollectionCompleteRequest,
	CollectionErrorRequest,
	CollectionVisibilityPausedRequest,
	CollectionVisibilityResumedRequest,
	TracksBatchRequest,
	type BackgroundRequestMessage,
} from '@/common/model/request-message';
import type { Track } from '@/common/model/track';
import { errorToReason } from '@/common/model/error-to-reason';

interface TracksBatchPayload {
	readonly tracks: readonly Track[];
	readonly skippedTrackCount: number;
}

export interface BackgroundSender {
	readonly sendBatch: (
		args: TracksBatchPayload,
	) => Effect.Effect<void, SendToBackgroundFailed>;
	readonly sendComplete: () => Effect.Effect<void, SendToBackgroundFailed>;
	readonly sendVisibilityPaused: () => Effect.Effect<
		void,
		SendToBackgroundFailed
	>;
	readonly sendVisibilityResumed: () => Effect.Effect<
		void,
		SendToBackgroundFailed
	>;
	readonly sendError: (
		message: string,
		reason: string,
	) => Effect.Effect<void, SendToBackgroundFailed>;
}

export class BackgroundSenderTag extends Context.Tag('BackgroundSender')<
	BackgroundSenderTag,
	BackgroundSender
>() {}

/**
 * Queue a message to the background without waiting for GetStateResponse.
 * The collection pipeline must not block on the background still handling
 * StartCollectionRequest from the same content tab (Chrome serializes SW handlers).
 */
function dispatchToBackground(
	message: BackgroundRequestMessage,
	detail: Readonly<Record<string, unknown>> = {},
): Effect.Effect<void, SendToBackgroundFailed> {
	return Effect.sync(() => {
		void chrome.runtime.sendMessage(message);
		return chrome.runtime.lastError;
	}).pipe(
		Effect.flatMap((lastError) =>
			lastError === undefined
				? Effect.void
				: Effect.fail(
						new SendToBackgroundFailed({
							reason: errorToReason(lastError),
						}),
					),
		),
		Effect.tap(() =>
			Effect.log('pipeline dispatchToBackground queued', message._tag, detail),
		),
		Effect.withLogSpan('sendToBackground'),
	);
}

export const BackgroundSenderLive: Layer.Layer<BackgroundSenderTag> =
	Layer.succeed(BackgroundSenderTag, {
		sendBatch: ({ tracks, skippedTrackCount }) =>
			dispatchToBackground(
				TracksBatchRequest({ tracks: [...tracks], skippedTrackCount }),
				{ trackCount: tracks.length, skippedTrackCount },
			),
		sendComplete: () => dispatchToBackground(CollectionCompleteRequest()),
		sendVisibilityPaused: () =>
			dispatchToBackground(CollectionVisibilityPausedRequest()),
		sendVisibilityResumed: () =>
			dispatchToBackground(CollectionVisibilityResumedRequest()),
		sendError: (message, reason) =>
			dispatchToBackground(CollectionErrorRequest({ message, reason })),
	});
