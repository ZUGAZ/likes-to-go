import type { BackgroundRequestMessage } from '@/common/model/request-message';
import { errorToReason } from '@/common/model/error-to-reason';
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
function sendToBackground(message: BackgroundRequestMessage): Promise<unknown> {
	return chrome.runtime.sendMessage(message);
}

export function sendToBackgroundEffect(
	message: BackgroundRequestMessage,
): Effect.Effect<unknown, SendToBackgroundFailed> {
	return Effect.gen(function* () {
		yield* Effect.log('sendToBackground dispatching', message._tag);
		const response = yield* Effect.tryPromise({
			try: () => sendToBackground(message),
			catch: (err: unknown) =>
				new SendToBackgroundFailed({
					reason: errorToReason(err),
				}),
		});
		yield* Effect.log('sendToBackground responded', message._tag);
		return response;
	}).pipe(Effect.withLogSpan('sendToBackground'));
}
