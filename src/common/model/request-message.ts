import { Schema } from "effect";
import { taggedStruct } from "@/common/model/tagged-struct";
import { TrackSchema } from "@/common/model/track";

// --- Request message schemas (discriminated union) ---

const StartCollectionSchema = taggedStruct("StartCollection");
const TracksBatchSchema = taggedStruct("TracksBatch", { tracks: Schema.Array(TrackSchema) });
const CollectionCompleteSchema = taggedStruct("CollectionComplete");
const CollectionErrorSchema = taggedStruct("CollectionError", { message: Schema.String });
const CancelCollectionSchema = taggedStruct("CancelCollection");
const DownloadExportSchema = taggedStruct("DownloadExport");
const GetStateSchema = taggedStruct("GetState");

export const RequestMessageSchema = Schema.Union(
	StartCollectionSchema,
	TracksBatchSchema,
	CollectionCompleteSchema,
	CollectionErrorSchema,
	CancelCollectionSchema,
	DownloadExportSchema,
	GetStateSchema,
);

export type RequestMessage = Schema.Schema.Type<typeof RequestMessageSchema>;

// --- Response type for GetState (background → popup) ---

const COLLECTION_STATUSES = ["idle", "collecting", "done", "error"] as const;

export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

const CollectionStatusSchema = Schema.Literal(...COLLECTION_STATUSES);

export const GetStateResponseSchema = Schema.Struct({
	status: CollectionStatusSchema,
	trackCount: Schema.Number,
	errorMessage: Schema.optional(Schema.String),
});

export type GetStateResponse = Schema.Schema.Type<typeof GetStateResponseSchema>;

export type MessageResponse = GetStateResponse | undefined;
