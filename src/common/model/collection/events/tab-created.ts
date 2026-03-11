import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const TabCreatedSchema = taggedStruct('TabCreated', {
	tabId: Schema.Number,
});

export type TabCreated = Schema.Schema.Type<typeof TabCreatedSchema>;

export const TabCreated = Data.tagged<TabCreated>('TabCreated');

export const isTabCreated = Schema.is(TabCreatedSchema);
