import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const SelectCollectionTabSchema = taggedStruct('SelectCollectionTab');

export type SelectCollectionTab = Schema.Schema.Type<
	typeof SelectCollectionTabSchema
>;

export const SelectCollectionTab = Data.tagged<SelectCollectionTab>(
	'SelectCollectionTab',
);

export const isSelectCollectionTab = Schema.is(SelectCollectionTabSchema);
