import { sendToBackground } from '@/common/infrastructure/send-to-background';
import type { GetStateResponse } from '@/common/model/request-message';
import { GetStateResponseSchema } from '@/common/model/request-message';
import { Schema } from 'effect';

/**
 * Request current collection state from the background. Validates response at boundary.
 */
export function getState(): Promise<GetStateResponse> {
	return sendToBackground({ _tag: 'GetState' }).then((raw) =>
		Schema.decodeUnknownPromise(GetStateResponseSchema)(raw),
	);
}
