import type { RequestMessage } from '@/common/model/request-message';
import { errorToReason } from '@/common/model/error-to-reason';
import { Data, Effect } from 'effect';

export class SendToTabMessagingFailed extends Data.TaggedError(
	'SendToTabMessagingFailed',
)<{
	readonly reason: string;
}> {}

/**
 * Send a request from background to a specific tab (e.g. content script).
 * Returns a Promise that resolves with the response or rejects on channel error.
 */
export function sendToTab(
	tabId: number,
	message: RequestMessage,
): Promise<unknown> {
	return chrome.tabs.sendMessage(tabId, message);
}

export function sendToTabEffect(
	tabId: number,
	message: RequestMessage,
): Effect.Effect<unknown, SendToTabMessagingFailed> {
	return Effect.tryPromise({
		try: () => sendToTab(tabId, message),
		catch: (err: unknown) =>
			new SendToTabMessagingFailed({
				reason: errorToReason(err),
			}),
	}).pipe(
		Effect.tap(() => Effect.log('Message:', message._tag)),
		Effect.withLogSpan('sendToTab'),
	);
}
