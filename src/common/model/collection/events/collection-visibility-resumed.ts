import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

const CollectionVisibilityResumedEventSchema = taggedStruct(
	'CollectionVisibilityResumed',
);

export type CollectionVisibilityResumed = Schema.Schema.Type<
	typeof CollectionVisibilityResumedEventSchema
>;

export const CollectionVisibilityResumed =
	Data.tagged<CollectionVisibilityResumed>('CollectionVisibilityResumed');

export const isCollectionVisibilityResumedEvent = Schema.is(
	CollectionVisibilityResumedEventSchema,
);
