import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const CloseTabSchema = taggedStruct('CloseTab', {
	tabId: Schema.Number,
});

export type CloseTab = Schema.Schema.Type<typeof CloseTabSchema>;

export const CloseTab = Data.tagged<CloseTab>('CloseTab');

export const isCloseTab = Schema.is(CloseTabSchema);
