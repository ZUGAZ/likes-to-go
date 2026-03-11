import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const CancelCollectionEventSchema = taggedStruct('CancelCollection');

export type CancelCollection = Schema.Schema.Type<
	typeof CancelCollectionEventSchema
>;

export const CancelCollection =
	Data.tagged<CancelCollection>('CancelCollection');

export const isCancelCollectionEvent = Schema.is(CancelCollectionEventSchema);
