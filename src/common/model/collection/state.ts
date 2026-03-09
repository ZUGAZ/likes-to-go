import { taggedStruct } from '@/common/model/tagged-struct';
import { TrackSchema } from '@/common/model/track';
import { Data, Schema } from 'effect';

const IdleSchema = taggedStruct('Idle');
const CollectingRequestedSchema = taggedStruct('CollectingRequested');
const CollectingStateSchema = taggedStruct('Collecting', {
	tabId: Schema.Number,
	tracks: Schema.Array(TrackSchema),
});
const DoneStateSchema = taggedStruct('Done', {
	tracks: Schema.Array(TrackSchema),
});
const ErrorStateSchema = taggedStruct('Error', {
	message: Schema.String,
});

export const CollectionStateSchema = Schema.Union(
	IdleSchema,
	CollectingRequestedSchema,
	CollectingStateSchema,
	DoneStateSchema,
	ErrorStateSchema,
);

export type CollectionState = Schema.Schema.Type<typeof CollectionStateSchema>;

type Idle = Schema.Schema.Type<typeof IdleSchema>;
export const Idle = Data.tagged<Idle>('Idle');

type CollectingRequested = Schema.Schema.Type<typeof CollectingRequestedSchema>;
export const CollectingRequested = Data.tagged<CollectingRequested>(
	'CollectingRequested',
);

type Collecting = Schema.Schema.Type<typeof CollectingStateSchema>;
export const Collecting = Data.tagged<Collecting>('Collecting');

type Done = Schema.Schema.Type<typeof DoneStateSchema>;
export const Done = Data.tagged<Done>('Done');

type ErrorState = Schema.Schema.Type<typeof ErrorStateSchema>;
export const ErrorState = Data.tagged<ErrorState>('Error');

export const isIdle = Schema.is(IdleSchema);
export const isCollectingRequested = Schema.is(CollectingRequestedSchema);
export const isCollecting = Schema.is(CollectingStateSchema);
export const isDone = Schema.is(DoneStateSchema);
export const isErrorState = Schema.is(ErrorStateSchema);

export function hasTracks(
	state: CollectionState,
): state is
	| Schema.Schema.Type<typeof CollectingStateSchema>
	| Schema.Schema.Type<typeof DoneStateSchema> {
	return isCollecting(state) || isDone(state);
}
