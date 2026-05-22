import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const CollectionVisibilityPausedEventSchema = taggedStruct(
	'CollectionVisibilityPaused',
);

export type CollectionVisibilityPaused = Schema.Schema.Type<
	typeof CollectionVisibilityPausedEventSchema
>;

export const CollectionVisibilityPaused =
	Data.tagged<CollectionVisibilityPaused>('CollectionVisibilityPaused');

export const isCollectionVisibilityPausedEvent = Schema.is(
	CollectionVisibilityPausedEventSchema,
);
