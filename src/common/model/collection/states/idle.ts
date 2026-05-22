import { taggedStruct } from '@/common/model/tagged-struct';
import { SourceSchema } from '@/common/model/source';
import { Data, Schema } from 'effect';

export const IdleSchema = taggedStruct('Idle', {
	source: Schema.optional(SourceSchema),
});

export type Idle = Schema.Schema.Type<typeof IdleSchema>;

export const Idle = Data.tagged<Idle>('Idle');

export const isIdle = Schema.is(IdleSchema);
