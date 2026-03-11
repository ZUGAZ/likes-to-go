import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const CollectionErrorEventSchema = taggedStruct('CollectionError', {
	message: Schema.String,
});

export type CollectionError = Schema.Schema.Type<
	typeof CollectionErrorEventSchema
>;

export const CollectionError = Data.tagged<CollectionError>('CollectionError');

export const isCollectionErrorEvent = Schema.is(CollectionErrorEventSchema);
