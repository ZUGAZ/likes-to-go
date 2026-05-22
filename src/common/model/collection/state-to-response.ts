import type { GetStateResponse } from '@/common/model/request-message';
import type { CollectionState } from '@/common/model/collection/state';
import { hasTracks } from '@/common/model/collection/state';
import { isErrorState } from '@/common/model/collection/states/error-state';
import { isIdle } from '@/common/model/collection/states/idle';
import { isPaused } from '@/common/model/collection/states/paused';
import { collectionStateToStatus } from '@/common/model/collection/state-to-status';
import { isCollecting } from './states/collecting';
import { COLLECTION_VISIBILITY_PAUSED_MESSAGE } from '@/common/model/collection/visibility-paused-message';

export function collectionStateToGetStateResponse(
	state: CollectionState,
): GetStateResponse {
	const status = collectionStateToStatus(state);
	const trackCount = hasTracks(state) ? state.tracks.length : 0;
	const message = isErrorState(state)
		? state.message
		: isPaused(state)
			? COLLECTION_VISIBILITY_PAUSED_MESSAGE
			: undefined;
	const skippedTrackCount =
		isCollecting(state) || isPaused(state)
			? state.skippedTrackCount
			: undefined;
	const baseResponse = {
		status,
		trackCount,
		...(message !== undefined && { message }),
		...(skippedTrackCount !== undefined &&
			skippedTrackCount > 0 && { skippedTrackCount }),
	};

	if (isIdle(state) && state.source !== undefined) {
		return {
			...baseResponse,
			source: state.source,
		};
	}

	return baseResponse;
}
