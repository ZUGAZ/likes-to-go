import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const LoginVerifiedEventSchema = taggedStruct('LoginVerified');

export type LoginVerified = Schema.Schema.Type<typeof LoginVerifiedEventSchema>;

export const LoginVerified = Data.tagged<LoginVerified>('LoginVerified');

export const isLoginVerified = Schema.is(LoginVerifiedEventSchema);
