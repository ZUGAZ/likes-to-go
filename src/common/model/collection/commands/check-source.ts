import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const CheckSourceSchema = taggedStruct('CheckSource');

export type CheckSource = Schema.Schema.Type<typeof CheckSourceSchema>;

export const CheckSource = Data.tagged<CheckSource>('CheckSource');

export const isCheckSource = Schema.is(CheckSourceSchema);
