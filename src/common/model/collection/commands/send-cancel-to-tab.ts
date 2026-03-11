import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const SendCancelToTabSchema = taggedStruct('SendCancelToTab', {
	tabId: Schema.Number,
});

export type SendCancelToTab = Schema.Schema.Type<typeof SendCancelToTabSchema>;

export const SendCancelToTab = Data.tagged<SendCancelToTab>('SendCancelToTab');

export const isSendCancelToTab = Schema.is(SendCancelToTabSchema);
