import { sendToTab } from '@/common/infrastructure/chrome-messaging';
import { catchError } from '@/common/model/catch-error';
import { SendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';
import { StartCollectionRequest } from '@/common/model/request-message';
import { Effect } from 'effect';

export function runSendStartToTab(
	tabId: number,
): Effect.Effect<void, SendToTabFailed> {
	const sendEffect = Effect.tryPromise({
		try: async () => {
			await sendToTab(tabId, StartCollectionRequest());
		},
		catch: catchError(
			SendToTabFailed,
			'Could not open or talk to the likes page',
		),
	});

	return Effect.gen(function* () {
		yield* Effect.log('background SendStartToTab', tabId);
		yield* sendEffect;
	}).pipe(Effect.withLogSpan('runSendStartToTab'));
}
