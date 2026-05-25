import { sendToTabEffect } from '@/common/infrastructure/chrome-messaging';
import { SendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';
import { CancelCollectionRequest } from '@/common/model/request-message';
import { Effect } from 'effect';

export function runSendCancelToTab(
	tabId: number,
): Effect.Effect<void, SendToTabFailed> {
	const sendEffect = sendToTabEffect(tabId, CancelCollectionRequest()).pipe(
		Effect.mapError((err) =>
			SendToTabFailed({
				message: 'Could not open or talk to the likes page',
				reason: err.reason,
			}),
		),
	);

	return Effect.gen(function* () {
		yield* Effect.log('background SendCancelToTab', tabId);
		yield* sendEffect;
	}).pipe(Effect.withLogSpan('runSendCancelToTab'));
}
