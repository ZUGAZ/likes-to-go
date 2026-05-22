import type { CollectionState } from '@/common/model/collection/state';
import { isCollecting } from '@/common/model/collection/states/collecting';
import { isCollectingRequested } from '@/common/model/collection/states/collecting-requested';
import { isDone } from '@/common/model/collection/states/done';
import { isLoginRequiredReason } from '@/common/model/collection/error-reason';
import { isErrorState } from '@/common/model/collection/states/error-state';
import { isIdle } from '@/common/model/collection/states/idle';
import { isPaused } from '@/common/model/collection/states/paused';
import type { CollectionStatus } from '@/common/model/request-message';

export function collectionStateToStatus(
	state: CollectionState,
): CollectionStatus {
	if (isIdle(state)) {
		return 'idle';
	}
	if (isCollectingRequested(state)) {
		return 'checking-login';
	}
	if (isCollecting(state)) {
		return 'collecting';
	}
	if (isPaused(state)) {
		return 'paused';
	}
	if (isDone(state)) {
		return 'done';
	}
	if (isErrorState(state)) {
		return isLoginRequiredReason(state.reason) ? 'login-required' : 'error';
	}
	return 'error';
}
