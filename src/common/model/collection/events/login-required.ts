import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const LoginRequiredEventSchema = taggedStruct('LoginRequired', {
	message: Schema.String,
	reason: Schema.String,
});

export type LoginRequired = Schema.Schema.Type<typeof LoginRequiredEventSchema>;

export const LoginRequired = Data.tagged<LoginRequired>('LoginRequired');

export const isLoginRequired = Schema.is(LoginRequiredEventSchema);
