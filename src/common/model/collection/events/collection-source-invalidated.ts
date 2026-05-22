import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const COLLECTION_SOURCE_INVALIDATED_MESSAGE =
	'Collection stopped because the selected SoundCloud page changed.';

export const CollectionSourceInvalidatedEventSchema = taggedStruct(
	'CollectionSourceInvalidated',
	{
		message: Schema.String,
		navigatedUrl: Schema.String,
		reason: Schema.String,
		selectedUrl: Schema.String,
		tabId: Schema.Number,
	},
);

export type CollectionSourceInvalidated = Schema.Schema.Type<
	typeof CollectionSourceInvalidatedEventSchema
>;

export const CollectionSourceInvalidated =
	Data.tagged<CollectionSourceInvalidated>('CollectionSourceInvalidated');

export const isCollectionSourceInvalidatedEvent = Schema.is(
	CollectionSourceInvalidatedEventSchema,
);
