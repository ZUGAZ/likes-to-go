import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const CollectionCompleteEventSchema = taggedStruct('CollectionComplete');

export type CollectionComplete = Schema.Schema.Type<
	typeof CollectionCompleteEventSchema
>;

export const CollectionComplete =
	Data.tagged<CollectionComplete>('CollectionComplete');

export const isCollectionCompleteEvent = Schema.is(
	CollectionCompleteEventSchema,
);
