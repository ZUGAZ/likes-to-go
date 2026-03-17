import type { GetStateResponse } from '@/common/model/request-message';
import type { CollectionState } from '@/common/model/collection/state';
import { hasTracks } from '@/common/model/collection/state';
import { isErrorState } from '@/common/model/collection/states/error-state';
import { collectionStateToStatus } from '@/common/model/collection/state-to-status';
import { isCollecting } from './states/collecting';

export function collectionStateToGetStateResponse(
	state: CollectionState,
): GetStateResponse {
	const status = collectionStateToStatus(state);
	const trackCount = hasTracks(state) ? state.tracks.length : 0;
	const errorMessage = isErrorState(state) ? state.message : undefined;
	const skippedTrackCount = isCollecting(state)
		? state.skippedTrackCount
		: undefined;
	return {
		status,
		trackCount,
		...(errorMessage !== undefined && { errorMessage }),
		...(skippedTrackCount !== undefined &&
			skippedTrackCount > 0 && { skippedTrackCount }),
	};
}
