import { sendToTab } from '@/common/infrastructure/chrome-messaging';
import { SendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';
import { CancelCollectionRequest } from '@/common/model/request-message';
import { Effect } from 'effect';

export function runSendCancelToTab(
	tabId: number,
): Effect.Effect<void, SendToTabFailed> {
	const sendEffect = Effect.tryPromise({
		try: async () => {
			await sendToTab(tabId, CancelCollectionRequest());
		},
		catch: (err: unknown) =>
			SendToTabFailed({
				message: err instanceof Error ? err.message : String(err),
			}),
	});

	return Effect.gen(function* () {
		yield* Effect.log('background SendCancelToTab', tabId);
		yield* sendEffect;
	}).pipe(Effect.withLogSpan('runSendCancelToTab'));
}
