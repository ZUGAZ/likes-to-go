import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const TabCompleteSchema = taggedStruct('TabComplete', {
	tabId: Schema.Number,
});

export type TabComplete = Schema.Schema.Type<typeof TabCompleteSchema>;

export const TabComplete = Data.tagged<TabComplete>('TabComplete');

export const isTabComplete = Schema.is(TabCompleteSchema);
