import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const SendStartToTabSchema = taggedStruct('SendStartToTab', {
	tabId: Schema.Number,
});

export type SendStartToTab = Schema.Schema.Type<typeof SendStartToTabSchema>;

export const SendStartToTab = Data.tagged<SendStartToTab>('SendStartToTab');

export const isSendStartToTab = Schema.is(SendStartToTabSchema);
