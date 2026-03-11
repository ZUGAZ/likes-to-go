import type { GetStateResponse } from '@/common/model/request-message';
import type { CollectionState } from '@/common/model/collection/state';
import { hasTracks } from '@/common/model/collection/state';
import { isCollecting } from '@/common/model/collection/states/collecting';
import { isCollectingRequested } from '@/common/model/collection/states/collecting-requested';
import { isDone } from '@/common/model/collection/states/done';
import { isErrorState } from '@/common/model/collection/states/error-state';
import { isIdle } from '@/common/model/collection/states/idle';

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
