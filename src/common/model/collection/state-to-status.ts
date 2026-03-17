import type { CollectionStatus } from '@/common/model/request-message';
import type { CollectionState } from '@/common/model/collection/state';
import { isCollecting } from '@/common/model/collection/states/collecting';
import { isCollectingRequested } from '@/common/model/collection/states/collecting-requested';
import { isDone } from '@/common/model/collection/states/done';
import { isErrorState } from '@/common/model/collection/states/error-state';
import { isIdle } from '@/common/model/collection/states/idle';

export function collectionStateToStatus(
	state: CollectionState,
): CollectionStatus {
	if (isIdle(state)) {
		return 'idle';
	}
	if (isCollectingRequested(state) || isCollecting(state)) {
		return 'collecting';
	}
	if (isDone(state)) {
		return 'done';
	}
	if (isErrorState(state)) {
		return 'error';
	}
	// Fallback for exhaustiveness; all current variants are covered above.
	return 'error';
}

