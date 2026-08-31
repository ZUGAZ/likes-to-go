import { Schema } from 'effect';

import {
	CollectingStateSchema,
	isCollecting,
} from '@/common/model/collection/states/collecting';
import { CollectingRequestedSchema } from '@/common/model/collection/states/collecting-requested';
import { DoneStateSchema, isDone } from '@/common/model/collection/states/done';
import { ErrorStateSchema } from '@/common/model/collection/states/error-state';
import { IdleSchema } from '@/common/model/collection/states/idle';
import {
	PausedStateSchema,
	isPaused,
} from '@/common/model/collection/states/paused';
import {
	SavingStateSchema,
	isSaving,
} from '@/common/model/collection/states/saving';

export const CollectionStateSchema = Schema.Union(
	IdleSchema,
	CollectingRequestedSchema,
	CollectingStateSchema,
	PausedStateSchema,
	DoneStateSchema,
	SavingStateSchema,
	ErrorStateSchema,
);

export type CollectionState = Schema.Schema.Type<typeof CollectionStateSchema>;

export function hasTracks(
	state: CollectionState,
): state is
	| Schema.Schema.Type<typeof CollectingStateSchema>
	| Schema.Schema.Type<typeof PausedStateSchema>
	| Schema.Schema.Type<typeof DoneStateSchema>
	| Schema.Schema.Type<typeof SavingStateSchema> {
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
