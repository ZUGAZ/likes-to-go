import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const ShowMascotSchema = taggedStruct('ShowMascot');

export type ShowMascot = Schema.Schema.Type<typeof ShowMascotSchema>;

export const ShowMascotRequest = Data.tagged<ShowMascot>('ShowMascot');

export const isShowMascot = Schema.is(ShowMascotSchema);
