import { taggedStruct } from '@/common/model/tagged-struct';
import { Schema } from 'effect';

const CreateTabSchema = taggedStruct('CreateTab', {
	url: Schema.String,
});

export type CreateTab = Schema.Schema.Type<typeof CreateTabSchema>;

export const isCreateTab = Schema.is(CreateTabSchema);
