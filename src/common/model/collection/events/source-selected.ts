import { SourceSchema } from '@/common/model/source';
import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const SourceSelectedEventSchema = taggedStruct('SourceSelected', {
	source: SourceSchema,
});

export type SourceSelected = Schema.Schema.Type<
	typeof SourceSelectedEventSchema
>;

export const SourceSelected = Data.tagged<SourceSelected>('SourceSelected');

export const isSourceSelected = Schema.is(SourceSelectedEventSchema);
