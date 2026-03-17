import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const SendToTabFailedSchema = taggedStruct('SendToTabFailed', {
	message: Schema.String,
	reason: Schema.String,
});

export type SendToTabFailed = Schema.Schema.Type<typeof SendToTabFailedSchema>;

export const SendToTabFailed = Data.tagged<SendToTabFailed>('SendToTabFailed');

export const isSendToTabFailed = Schema.is(SendToTabFailedSchema);
