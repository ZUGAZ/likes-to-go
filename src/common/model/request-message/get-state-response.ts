import { Schema } from 'effect';
import { CollectionStatusSchema } from '@/common/model/collection/collection-status';
import { SourceSchema } from '@/common/model/source';

export {
	CollectionStatusSchema,
	type CollectionStatus,
} from '@/common/model/collection/collection-status';

export const GetStateResponseSchema = Schema.Struct({
	status: CollectionStatusSchema,
	trackCount: Schema.Number,
	message: Schema.optional(Schema.String),
	skippedTrackCount: Schema.optional(Schema.Number),
	source: Schema.optional(SourceSchema),
	exportBody: Schema.optional(Schema.String),
});

export type GetStateResponse = Schema.Schema.Type<
	typeof GetStateResponseSchema
>;

export type MessageResponse = GetStateResponse | undefined;
