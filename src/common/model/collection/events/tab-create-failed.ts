import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const TabCreateFailedSchema = taggedStruct('TabCreateFailed', {
	message: Schema.String,
});

export type TabCreateFailed = Schema.Schema.Type<typeof TabCreateFailedSchema>;

export const TabCreateFailed = Data.tagged<TabCreateFailed>('TabCreateFailed');

export const isTabCreateFailed = Schema.is(TabCreateFailedSchema);
