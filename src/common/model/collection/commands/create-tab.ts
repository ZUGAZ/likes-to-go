import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const CreateTabSchema = taggedStruct('CreateTab', {
	url: Schema.String,
});

export type CreateTab = Schema.Schema.Type<typeof CreateTabSchema>;

export const CreateTab = Data.tagged<CreateTab>('CreateTab');

export const isCreateTab = Schema.is(CreateTabSchema);
