import type { GetStateResponse } from '@/common/model/request-message';
import type { CollectionState } from '@/common/model/collection/state';
import { hasTracks } from '@/common/model/collection/state';
import { isErrorState } from '@/common/model/collection/states/error-state';
import { collectionStateToStatus } from '@/common/model/collection/state-to-status';

export function collectionStateToGetStateResponse(
	state: CollectionState,
): GetStateResponse {
	const status = collectionStateToStatus(state);
	const trackCount = hasTracks(state) ? state.tracks.length : 0;
	const errorMessage = isErrorState(state) ? state.message : undefined;
	return {
		status,
		trackCount,
		...(errorMessage !== undefined && { errorMessage }),
	};
}
