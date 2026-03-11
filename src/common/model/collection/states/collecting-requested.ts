import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const CollectingRequestedSchema = taggedStruct('CollectingRequested');

export type CollectingRequested = Schema.Schema.Type<
	typeof CollectingRequestedSchema
>;

export const CollectingRequested = Data.tagged<CollectingRequested>(
	'CollectingRequested',
);

export const isCollectingRequested = Schema.is(CollectingRequestedSchema);
