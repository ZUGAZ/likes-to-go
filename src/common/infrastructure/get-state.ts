import {
	SendToBackgroundFailed,
	sendToBackgroundEffect,
} from '@/common/infrastructure/send-to-background';
import {
	GetStateRequest,
	GetStateResponseSchema,
	type GetStateResponse,
} from '@/common/model/request-message';
import { errorToReason } from '@/common/model/error-to-reason';
import { Data, Effect, Schema } from 'effect';

export class DecodeGetStateResponseFailed extends Data.TaggedError(
	'DecodeGetStateResponseFailed',
)<{
	readonly reason: string;
}> {}

function sendToBackgroundFailedToGetStateResponse(
	err: SendToBackgroundFailed,
): GetStateResponse {
	return {
		status: 'error',
		trackCount: 0,
		message: `Could not reach the extension. ${err.reason}`,
	};
}

function decodeGetStateResponseFailedToGetStateResponse(
	err: DecodeGetStateResponseFailed,
): GetStateResponse {
	return {
		status: 'error',
		trackCount: 0,
		message: `Could not read extension state. ${err.reason}`,
	};
}

/**
 * Decode unknown value as GetStateResponse. Use at message boundary when background returns state.
 */
export function decodeGetStateResponse(
	raw: unknown,
): Effect.Effect<GetStateResponse, DecodeGetStateResponseFailed> {
	return Effect.try({
		try: () => Schema.decodeUnknownSync(GetStateResponseSchema)(raw),
		catch: (err: unknown) =>
			new DecodeGetStateResponseFailed({
				reason: errorToReason(err),
			}),
	});
}

/**
 * Request current collection state from the background. Validates response at boundary.
 * Messaging or decode failures become a successful {@link GetStateResponse} with `status: 'error'`.
 */
export function getState(): Effect.Effect<GetStateResponse> {
	return sendToBackgroundEffect(GetStateRequest()).pipe(
		Effect.flatMap(decodeGetStateResponse),
		Effect.catchTag('SendToBackgroundFailed', (err) =>
			Effect.succeed(sendToBackgroundFailedToGetStateResponse(err)),
		),
		Effect.catchTag('DecodeGetStateResponseFailed', (err) =>
			Effect.succeed(decodeGetStateResponseFailedToGetStateResponse(err)),
		),
		Effect.withLogSpan('getState'),
	);
}
