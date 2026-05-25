import { sendToTabEffect } from '@/common/infrastructure/chrome-messaging';
import { catchError } from '@/common/model/catch-error';
import { SendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';
import { StartCollectionRequest } from '@/common/model/request-message';
import { Effect } from 'effect';

const SEND_START_RETRY_DELAYS_MS: readonly number[] = [200, 400, 800, 1600];

function isMissingContentScriptReceiver(error: SendToTabFailed): boolean {
	return (
		error.reason.includes('Receiving end does not exist') ||
		error.reason.includes('Could not establish connection')
	);
}

export function runSendStartToTab(
	tabId: number,
): Effect.Effect<void, SendToTabFailed> {
	const focusTabEffect = Effect.tryPromise({
		try: async () => {
			const tab = await chrome.tabs.update(tabId, { active: true });
			if (tab === undefined) return;
			await chrome.windows.update(tab.windowId, { focused: true });
		},
		catch: catchError(SendToTabFailed, 'Could not focus the collection tab'),
	});

	const sendEffect = sendToTabEffect(tabId, StartCollectionRequest()).pipe(
		Effect.mapError((err) =>
			SendToTabFailed({
				message: 'Could not open or talk to the likes page',
				reason: err.reason,
			}),
		),
	);

	const sendWithRetry = (
		delaysMs: readonly number[],
	): Effect.Effect<void, SendToTabFailed> =>
		sendEffect.pipe(
			Effect.catchAll((error) => {
				const [delayMs, ...remainingDelaysMs] = delaysMs;
				if (!isMissingContentScriptReceiver(error) || delayMs === undefined) {
					return Effect.fail(error);
				}

				return Effect.log('background SendStartToTab retry', {
					tabId,
					delayMs,
				}).pipe(
					Effect.zipRight(Effect.sleep(delayMs)),
					Effect.zipRight(sendWithRetry(remainingDelaysMs)),
				);
			}),
		);

	return Effect.gen(function* () {
		yield* Effect.log('background SendStartToTab', tabId);
		yield* focusTabEffect;
		yield* sendWithRetry(SEND_START_RETRY_DELAYS_MS);
	}).pipe(Effect.withLogSpan('runSendStartToTab'));
}
