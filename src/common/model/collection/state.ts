import {
	isCollecting,
	type Collecting,
} from '@/common/model/collection/states/collecting';
import type { CollectingRequested } from '@/common/model/collection/states/collecting-requested';
import { isDone, type Done } from '@/common/model/collection/states/done';
import type { ErrorState } from '@/common/model/collection/states/error-state';
import type { Idle } from '@/common/model/collection/states/idle';
import { isPaused, type Paused } from '@/common/model/collection/states/paused';
import { isSaving, type Saving } from '@/common/model/collection/states/saving';

export type CollectionState =
	| Idle
	| CollectingRequested
	| Collecting
	| Paused
	| Done
	| Saving
	| ErrorState;

export function hasTracks(
	state: CollectionState,
): state is Collecting | Paused | Done | Saving {
	return (
		isCollecting(state) || isPaused(state) || isDone(state) || isSaving(state)
	);
}

export function collectionTabId(state: CollectionState): number | undefined {
	if (isCollecting(state) || isPaused(state)) {
		return state.tabId;
	}
	return undefined;
}
