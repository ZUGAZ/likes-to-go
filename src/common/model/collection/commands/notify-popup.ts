import { CollectionStateSchema } from '@/common/model/collection/state';
import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const NotifyPopupSchema = taggedStruct('NotifyPopup', {
	state: CollectionStateSchema,
});

export type NotifyPopup = Schema.Schema.Type<typeof NotifyPopupSchema>;

export const NotifyPopup = Data.tagged<NotifyPopup>('NotifyPopup');

export const isNotifyPopup = Schema.is(NotifyPopupSchema);
