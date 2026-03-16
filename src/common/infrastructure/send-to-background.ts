import type { RequestMessage } from '@/common/model/request-message';
import { Data, Effect } from 'effect';

export class SendToBackgroundFailed extends Data.TaggedError(
	'SendToBackgroundFailed',
)<{
	readonly reason: string;
}> {}

/**
 * Send a request to the background script. Returns a Promise that resolves with the response
 * (e.g. GetStateResponse for GetState) or rejects on channel error.
 */
export function sendToBackground(message: RequestMessage): Promise<unknown> {
	return chrome.runtime.sendMessage(message);
}

export function sendToBackgroundEffect(
	message: RequestMessage,
): Effect.Effect<unknown, SendToBackgroundFailed> {
	return Effect.tryPromise({
		try: () => sendToBackground(message),
		catch: (err: unknown) =>
			new SendToBackgroundFailed({
				reason: err instanceof Error ? err.message : String(err),
			}),
	}).pipe(
		Effect.tap(() => Effect.log('Message:', message._tag)),
		Effect.withLogSpan('sendToBackground'),
	);
}
