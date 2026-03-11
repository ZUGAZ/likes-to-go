import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const ErrorStateSchema = taggedStruct('Error', {
	message: Schema.String,
});

export type ErrorState = Schema.Schema.Type<typeof ErrorStateSchema>;

export const ErrorState = Data.tagged<ErrorState>('Error');

export const isErrorState = Schema.is(ErrorStateSchema);
