import { Schema } from 'effect';
import { SourceSchema } from '@/common/model/source';

const COLLECTION_STATUSES = [
	'idle',
	'checking-login',
	'collecting',
	'paused',
	'done',
	'login-required',
	'error',
] as const;

export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

export const CollectionStatusSchema = Schema.Literal(...COLLECTION_STATUSES);

export const GetStateResponseSchema = Schema.Struct({
	status: CollectionStatusSchema,
	trackCount: Schema.Number,
	message: Schema.optional(Schema.String),
	skippedTrackCount: Schema.optional(Schema.Number),
	source: Schema.optional(SourceSchema),
});

export type GetStateResponse = Schema.Schema.Type<
	typeof GetStateResponseSchema
>;

export type MessageResponse = GetStateResponse | undefined;
