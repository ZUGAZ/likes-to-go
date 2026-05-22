import { taggedStruct } from '@/common/model/tagged-struct';
import { SourceSchema } from '@/common/model/source';
import { Data, Schema } from 'effect';

export const ErrorStateSchema = taggedStruct('Error', {
	message: Schema.String,
	source: Schema.optional(SourceSchema),
});

export type ErrorState = Schema.Schema.Type<typeof ErrorStateSchema>;

export const ErrorState = Data.tagged<ErrorState>('Error');

export const isErrorState = Schema.is(ErrorStateSchema);
