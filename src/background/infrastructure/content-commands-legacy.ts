import { ContentCommandsTag } from '@/background/content-commands';
import { sendToTabEffect } from '@/common/infrastructure/chrome-messaging';
import { isMissingContentScriptReceiverReason } from '@/common/infrastructure/is-missing-content-script-receiver';
import { SendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';
import {
	CancelCollectionRequest,
	ShowMascotRequest,
	StartCollectionRequest,
	ToggleMascotRequest,
	type RequestMessage,
} from '@/common/model/request-message';
import { Effect, Layer } from 'effect';

const SEND_START_RETRY_DELAYS_MS: readonly number[] = [200, 400, 800, 1600];
const TOGGLE_MASCOT_RETRY_DELAYS_MS: readonly number[] = [200, 400, 800];

function sendToTabWithMissingReceiverRetry(
	tabId: number,
	message: RequestMessage,
	delaysMs: readonly number[],
): Effect.Effect<void> {
	const sendEffect = sendToTabEffect(tabId, message);

	return sendEffect.pipe(
		Effect.tap(() => Effect.log(`${message._tag} sent`, { tabId })),
		Effect.catchAll((error) => {
			const [delayMs, ...remainingDelaysMs] = delaysMs;
			if (
				!isMissingContentScriptReceiverReason(error.reason) ||
				delayMs === undefined
			) {
				return Effect.logWarning(`${message._tag} send failed`, {
					tabId,
					reason: error.reason,
				});
			}

			return Effect.log(`${message._tag} retry`, { tabId, delayMs }).pipe(
				Effect.zipRight(Effect.sleep(delayMs)),
				Effect.zipRight(
					sendToTabWithMissingReceiverRetry(tabId, message, remainingDelaysMs),
				),
			);
		}),
	);
}

const startPageCollection = (
	tabId: number,
): Effect.Effect<void, SendToTabFailed> => {
	const sendWithRetry = (
		delaysMs: readonly number[],
	): Effect.Effect<void, SendToTabFailed> =>
		sendToTabEffect(tabId, StartCollectionRequest()).pipe(
			Effect.mapError((err) =>
				SendToTabFailed({
					message: 'Could not open or talk to the likes page',
					reason: err.reason,
				}),
			),
			Effect.catchAll((error) => {
				const [delayMs, ...remainingDelaysMs] = delaysMs;
				if (
					!isMissingContentScriptReceiverReason(error.reason) ||
					delayMs === undefined
				) {
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

	return sendWithRetry(SEND_START_RETRY_DELAYS_MS);
};

const cancelPageCollection = (
	tabId: number,
): Effect.Effect<void, SendToTabFailed> =>
	sendToTabEffect(tabId, CancelCollectionRequest()).pipe(
		Effect.mapError((err) =>
			SendToTabFailed({
				message: 'Could not open or talk to the likes page',
				reason: err.reason,
			}),
		),
	);

const toggleMascot = (tabId: number): Effect.Effect<void> =>
	sendToTabWithMissingReceiverRetry(
		tabId,
		ToggleMascotRequest(),
		TOGGLE_MASCOT_RETRY_DELAYS_MS,
	);

const showMascot = (tabId: number): Effect.Effect<void> =>
	sendToTabWithMissingReceiverRetry(
		tabId,
		ShowMascotRequest(),
		TOGGLE_MASCOT_RETRY_DELAYS_MS,
	);

export const ContentCommandsLegacy: Layer.Layer<ContentCommandsTag> =
	Layer.succeed(ContentCommandsTag, {
		startPageCollection,
		cancelPageCollection,
		toggleMascot,
		showMascot,
	});
