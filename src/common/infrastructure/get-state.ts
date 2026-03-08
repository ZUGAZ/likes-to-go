import { sendToBackground } from '@/common/infrastructure/send-to-background';
import type { GetStateResponse } from '@/common/model/get-state-response';
import { GetStateResponseSchema } from '@/common/model/get-state-response';
import { GetStateRequest } from '@/common/model/request-message';
import { Schema } from 'effect';

/**
 * Decode unknown value as GetStateResponse. Use at message boundary when background returns state.
 */
export function decodeGetStateResponse(
	raw: unknown,
): Promise<GetStateResponse> {
	return Schema.decodeUnknownPromise(GetStateResponseSchema)(raw);
}

/**
 * Request current collection state from the background. Validates response at boundary.
 */
export function getState(): Promise<GetStateResponse> {
	return sendToBackground(GetStateRequest()).then(decodeGetStateResponse);
}
