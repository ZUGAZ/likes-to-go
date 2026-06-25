import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const ToggleMascotSchema = taggedStruct('ToggleMascot');

export type ToggleMascot = Schema.Schema.Type<typeof ToggleMascotSchema>;

export const ToggleMascotRequest = Data.tagged<ToggleMascot>('ToggleMascot');

export const isToggleMascot = Schema.is(ToggleMascotSchema);
