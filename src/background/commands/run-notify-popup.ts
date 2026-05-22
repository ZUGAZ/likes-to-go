import { Effect } from 'effect';

import { collectionStateToGetStateResponse } from '@/common/model/collection/state-to-response';
import type { CollectionState } from '@/common/model/collection/state';
import { PopupStateUpdate } from '@/common/model/request-message/popup-state-update';
import { errorToReason } from '@/common/model/error-to-reason';

export function runNotifyPopup(state: CollectionState): Effect.Effect<void> {
	const response = collectionStateToGetStateResponse(state);
	const update = PopupStateUpdate({
		status: response.status,
		trackCount: response.trackCount,
		...(response.message === undefined ? {} : { message: response.message }),
		...(response.skippedTrackCount === undefined
			? {}
			: { skippedTrackCount: response.skippedTrackCount }),
		...(response.source === undefined ? {} : { source: response.source }),
	});

	return Effect.tryPromise({
		try: () => chrome.runtime.sendMessage(update),
		catch: (err: unknown) =>
			PopupStateUpdate({
				status: response.status,
				trackCount: response.trackCount,
				message: errorToReason(err),
			}),
	}).pipe(Effect.ignore);
}
