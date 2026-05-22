import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const CollectionTabSelectedSchema = taggedStruct(
	'CollectionTabSelected',
	{
		sourceUrl: Schema.String,
		tabId: Schema.Number,
	},
);

export type CollectionTabSelected = Schema.Schema.Type<
	typeof CollectionTabSelectedSchema
>;

export const CollectionTabSelected = Data.tagged<CollectionTabSelected>(
	'CollectionTabSelected',
);

export const isCollectionTabSelected = Schema.is(CollectionTabSelectedSchema);
