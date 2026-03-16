import {
	SendToBackgroundFailed,
	sendToBackgroundEffect,
} from '@/common/infrastructure/send-to-background';
import {
	GetStateRequest,
	GetStateResponseSchema,
	type GetStateResponse,
} from '@/common/model/request-message';
import { Data, Effect, Schema } from 'effect';

export class DecodeGetStateResponseFailed extends Data.TaggedError(
	'DecodeGetStateResponseFailed',
)<{
	readonly reason: string;
}> {}

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
				reason: err instanceof Error ? err.message : String(err),
			}),
	});
}

/**
 * Request current collection state from the background. Validates response at boundary.
 */
export function getState(): Effect.Effect<
	GetStateResponse,
	SendToBackgroundFailed | DecodeGetStateResponseFailed
> {
	return sendToBackgroundEffect(GetStateRequest()).pipe(
		Effect.flatMap(decodeGetStateResponse),
		Effect.withLogSpan('getState'),
	);
}
