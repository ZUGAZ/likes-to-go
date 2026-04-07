import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const GetStateRequestedEventSchema = taggedStruct('GetStateRequested');

export type GetStateRequested = Schema.Schema.Type<
	typeof GetStateRequestedEventSchema
>;

export const GetStateRequested =
	Data.tagged<GetStateRequested>('GetStateRequested');

export const isGetStateRequested = Schema.is(GetStateRequestedEventSchema);
