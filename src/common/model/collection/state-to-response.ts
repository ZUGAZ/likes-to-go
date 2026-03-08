import type { GetStateResponse } from '@/common/model/request-message';
import {
	hasTracks,
	isCollecting,
	isCollectingRequested,
	isDone,
	isErrorState,
	isIdle,
} from './state';
import type { CollectionState } from './state';

export function collectionStateToGetStateResponse(
	state: CollectionState,
): GetStateResponse {
	const status = isIdle(state)
		? 'idle'
		: isCollectingRequested(state) || isCollecting(state)
			? 'collecting'
			: isDone(state)
				? 'done'
				: 'error';
	const trackCount = hasTracks(state) ? state.tracks.length : 0;
	const errorMessage = isErrorState(state) ? state.message : undefined;
	return {
		status,
		trackCount,
		...(errorMessage !== undefined && { errorMessage }),
	};
}
