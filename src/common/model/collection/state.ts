import { Schema } from 'effect';

import {
	CollectingStateSchema,
	isCollecting,
} from '@/common/model/collection/states/collecting';
import { CollectingRequestedSchema } from '@/common/model/collection/states/collecting-requested';
import { DoneStateSchema, isDone } from '@/common/model/collection/states/done';
import { ErrorStateSchema } from '@/common/model/collection/states/error-state';
import { IdleSchema } from '@/common/model/collection/states/idle';

export const CollectionStateSchema = Schema.Union(
	IdleSchema,
	CollectingRequestedSchema,
	CollectingStateSchema,
	DoneStateSchema,
	ErrorStateSchema,
);

export type CollectionState = Schema.Schema.Type<typeof CollectionStateSchema>;

export function hasTracks(
	state: CollectionState,
): state is
	| Schema.Schema.Type<typeof CollectingStateSchema>
	| Schema.Schema.Type<typeof DoneStateSchema> {
	return isCollecting(state) || isDone(state);
}
