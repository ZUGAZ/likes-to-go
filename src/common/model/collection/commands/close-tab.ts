import { taggedStruct } from '@/common/model/tagged-struct';
import { Schema } from 'effect';

const CloseTabSchema = taggedStruct('CloseTab', {
	tabId: Schema.Number,
});

export type CloseTab = Schema.Schema.Type<typeof CloseTabSchema>;

export const isCloseTab = Schema.is(CloseTabSchema);
