import { sendToTab } from '@/common/infrastructure/chrome-messaging';
import { SendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';
import { CancelCollectionRequest } from '@/common/model/request-message';
import { Effect } from 'effect';

export function runSendCancelToTab(
	tabId: number,
): Effect.Effect<void, SendToTabFailed> {
	return Effect.tryPromise({
		try: async () => {
			await sendToTab(tabId, CancelCollectionRequest());
		},
		catch: (err: unknown) =>
			SendToTabFailed({
				message: err instanceof Error ? err.message : String(err),
			}),
	});
}
