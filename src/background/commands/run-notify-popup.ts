import { Effect } from 'effect';

import { collectionStateToGetStateResponse } from '@/common/model/collection/state-to-response';
import type { CollectionState } from '@/common/model/collection/state';
import { PopupStateUpdate } from '@/common/model/request-message/popup-state-update';

export function runNotifyPopup(state: CollectionState): Effect.Effect<void> {
	const response = collectionStateToGetStateResponse(state);
	const message = PopupStateUpdate({
		status: response.status,
		trackCount: response.trackCount,
		...(response.errorMessage === undefined
			? {}
			: { errorMessage: response.errorMessage }),
	});

	return Effect.tryPromise({
		try: () => chrome.runtime.sendMessage(message),
		catch: (err: unknown) =>
			PopupStateUpdate({
				status: response.status,
				trackCount: response.trackCount,
				errorMessage: err instanceof Error ? err.message : String(err),
			}),
	}).pipe(Effect.ignore);
}
 