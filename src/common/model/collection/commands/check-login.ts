import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const CheckLoginSchema = taggedStruct('CheckLogin');

export type CheckLogin = Schema.Schema.Type<typeof CheckLoginSchema>;

export const CheckLogin = Data.tagged<CheckLogin>('CheckLogin');

export const isCheckLogin = Schema.is(CheckLoginSchema);
