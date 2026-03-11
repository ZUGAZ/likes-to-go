import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const StartCollectionEventSchema = taggedStruct('StartCollection');

export type StartCollection = Schema.Schema.Type<
	typeof StartCollectionEventSchema
>;

export const StartCollection = Data.tagged<StartCollection>('StartCollection');

export const isStartCollectionEvent = Schema.is(StartCollectionEventSchema);
