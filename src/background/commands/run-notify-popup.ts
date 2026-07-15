import { Effect } from 'effect';

import {
	getMascotUiSurfaceEffect,
	MascotUiSurfaceRefTag,
} from '@/background/mascot-ui-surface';
import {
	sendPopupStateUpdateToExtensionPages,
	sendPopupStateUpdateToTab,
} from '@/background/infrastructure/send-popup-state-update';
import { resolveMascotNotifyDestination } from '@/background/resolve-mascot-notify-destination';
import { collectionStateToGetStateResponse } from '@/common/model/collection/state-to-response';
import type { CollectionState } from '@/common/model/collection/state';
import {
	PopupStateUpdate,
	type PopupStateUpdate as PopupStateUpdateMessage,
} from '@/common/model/request-message/popup-state-update';

function buildPopupStateUpdate(state: CollectionState): PopupStateUpdateMessage {
	const response = collectionStateToGetStateResponse(state);
	return PopupStateUpdate({
		status: response.status,
		trackCount: response.trackCount,
		...(response.message === undefined ? {} : { message: response.message }),
		...(response.skippedTrackCount === undefined
			? {}
			: { skippedTrackCount: response.skippedTrackCount }),
		...(response.source === undefined ? {} : { source: response.source }),
	});
}

function sendToDestination(
	destination: ReturnType<typeof resolveMascotNotifyDestination>,
	update: PopupStateUpdateMessage,
): Effect.Effect<void> {
	if (destination._tag === 'ContentOverlay') {
		return sendPopupStateUpdateToTab(destination.tabId, update);
	}
	return sendPopupStateUpdateToExtensionPages(update);
}

export function runNotifyPopup(
	state: CollectionState,
): Effect.Effect<void, never, MascotUiSurfaceRefTag> {
	const update = buildPopupStateUpdate(state);

	return Effect.gen(function* () {
		const surface = yield* getMascotUiSurfaceEffect();
		const destination = resolveMascotNotifyDestination(surface);
		yield* sendToDestination(destination, update);
	}).pipe(Effect.withLogSpan('runNotifyPopup'));
}
