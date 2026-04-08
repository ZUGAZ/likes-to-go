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

function transportErrorToGetStateResponse(
	err: SendToBackgroundFailed | DecodeGetStateResponseFailed,
): GetStateResponse {
	if (err instanceof SendToBackgroundFailed) {
		return {
			status: 'error',
			trackCount: 0,
			errorMessage: `Could not reach the extension. ${err.reason}`,
		};
	}
	return {
		status: 'error',
		trackCount: 0,
		errorMessage: `Could not read extension state. ${err.reason}`,
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
		Effect.catchAll((err) =>
			Effect.succeed(transportErrorToGetStateResponse(err)),
		),
		Effect.withLogSpan('getState'),
	);
}
