import { Effect } from 'effect';

import { collectionStateToGetStateResponse } from '@/common/model/collection/state-to-response';
import type { CollectionState } from '@/common/model/collection/state';
import { PopupStateUpdate } from '@/common/model/request-message/popup-state-update';
import { errorToReason } from '@/common/model/error-to-reason';

export function runNotifyPopup(state: CollectionState): Effect.Effect<void> {
	const response = collectionStateToGetStateResponse(state);
	const message = PopupStateUpdate({
		status: response.status,
		trackCount: response.trackCount,
		...(response.errorMessage === undefined
			? {}
			: { errorMessage: response.errorMessage }),
		...(response.skippedTrackCount === undefined
			? {}
			: { skippedTrackCount: response.skippedTrackCount }),
	});

	return Effect.tryPromise({
		try: () => chrome.runtime.sendMessage(message),
		catch: (err: unknown) =>
			PopupStateUpdate({
				status: response.status,
				trackCount: response.trackCount,
				errorMessage: errorToReason(err),
			}),
	}).pipe(Effect.ignore);
}
