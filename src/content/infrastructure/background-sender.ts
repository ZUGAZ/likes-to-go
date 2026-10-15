import { BackgroundClientTag } from '@/common/infrastructure/background-client';
import { SendToBackgroundFailed } from '@/common/infrastructure/send-to-background';
import type { Track } from '@/common/model/track';
import { portErrorReason } from '@/mascot/infrastructure/collection-backend-rpc';
import { RpcClientError } from '@effect/rpc/RpcClientError';
import {
	Disconnected,
	ExtensionContextInvalidated,
	Timeout,
} from 'browser-extension-kit/messaging';
import { Context, Effect, Layer, Schema } from 'effect';

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
	readonly sendLoginRequired: (
		message: string,
		reason: string,
	) => Effect.Effect<void, SendToBackgroundFailed>;
}

export class BackgroundSenderTag extends Context.Tag('BackgroundSender')<
	BackgroundSenderTag,
	BackgroundSender
>() {}

const isDisconnected = Schema.is(Disconnected);
const isExtensionContextInvalidated = Schema.is(ExtensionContextInvalidated);
const isTimeout = Schema.is(Timeout);

const reasonForClientError = (error: RpcClientError): string => {
	const cause = error.cause;
	if (
		isDisconnected(cause) ||
		isExtensionContextInvalidated(cause) ||
		isTimeout(cause)
	) {
		return portErrorReason(cause);
	}

	return portErrorReason(new Disconnected({ detail: error.message }));
};

/**
 * Queue a frame on the background port.
 * The call does not wait for the background to apply it.
 * A reconnecting client waits until the next connection.
 * A terminal client fails the send.
 */
function sendDiscard(
	call: Effect.Effect<void, RpcClientError>,
	tag: string,
	detail: Readonly<Record<string, unknown>> = {},
): Effect.Effect<void, SendToBackgroundFailed> {
	return call.pipe(
		Effect.mapError(
			(error) =>
				new SendToBackgroundFailed({
					reason: reasonForClientError(error),
				}),
		),
		Effect.tap(() =>
			Effect.log('pipeline dispatchToBackground queued', tag, detail),
		),
		Effect.withLogSpan('sendToBackground'),
	);
}

export const BackgroundSenderLive: Layer.Layer<
	BackgroundSenderTag,
	never,
	BackgroundClientTag
> = Layer.effect(
	BackgroundSenderTag,
	Effect.gen(function* () {
		const { client } = yield* BackgroundClientTag;

		return {
			sendBatch: ({ tracks, skippedTrackCount }) =>
				sendDiscard(
					client.TracksBatch(
						{ tracks: [...tracks], skippedTrackCount },
						{ discard: true },
					),
					'TracksBatch',
					{ trackCount: tracks.length, skippedTrackCount },
				),
			sendComplete: () =>
				sendDiscard(
					client.CollectionComplete(undefined, { discard: true }),
					'CollectionComplete',
				),
			sendVisibilityPaused: () =>
				sendDiscard(
					client.CollectionVisibilityPaused(undefined, { discard: true }),
					'CollectionVisibilityPaused',
				),
			sendVisibilityResumed: () =>
				sendDiscard(
					client.CollectionVisibilityResumed(undefined, { discard: true }),
					'CollectionVisibilityResumed',
				),
			sendError: (message, reason) =>
				sendDiscard(
					client.CollectionError({ message, reason }, { discard: true }),
					'CollectionError',
				),
			sendLoginRequired: (message, reason) =>
				sendDiscard(
					client.LoginRequired({ message, reason }, { discard: true }),
					'LoginRequired',
				),
		};
	}),
);
