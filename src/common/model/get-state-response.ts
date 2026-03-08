import { Schema } from 'effect';

const COLLECTION_STATUSES = ['idle', 'collecting', 'done', 'error'] as const;

export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

const CollectionStatusSchema = Schema.Literal(...COLLECTION_STATUSES);

export const GetStateResponseSchema = Schema.Struct({
	status: CollectionStatusSchema,
	trackCount: Schema.Number,
	errorMessage: Schema.optional(Schema.String),
});

export type GetStateResponse = Schema.Schema.Type<
	typeof GetStateResponseSchema
>;

export type MessageResponse = GetStateResponse | undefined;
