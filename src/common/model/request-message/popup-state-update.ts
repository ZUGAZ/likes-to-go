import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const PopupStateUpdateSchema = taggedStruct('PopupStateUpdate', {
	status: Schema.Literal('idle', 'collecting', 'done', 'error'),
	trackCount: Schema.Number,
	errorMessage: Schema.optional(Schema.String),
});

export type PopupStateUpdate = Schema.Schema.Type<typeof PopupStateUpdateSchema>;

export const PopupStateUpdate = Data.tagged<PopupStateUpdate>('PopupStateUpdate');

export const isPopupStateUpdate = Schema.is(PopupStateUpdateSchema);
