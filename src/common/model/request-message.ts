import { taggedStruct } from '@/common/model/tagged-struct';
import { TrackSchema } from '@/common/model/track';
import { Data, Schema } from 'effect';

// --- Request message schemas (discriminated union) ---

export const StartCollectionSchema = taggedStruct('StartCollection');
export const TracksBatchSchema = taggedStruct('TracksBatch', {
	tracks: Schema.Array(TrackSchema),
});
export const CollectionCompleteSchema = taggedStruct('CollectionComplete');
export const CollectionErrorSchema = taggedStruct('CollectionError', {
	message: Schema.String,
});
export const CancelCollectionSchema = taggedStruct('CancelCollection');
export const DownloadExportSchema = taggedStruct('DownloadExport');
export const GetStateSchema = taggedStruct('GetState');

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

// --- Request constructors (Data.tagged) ---

type StartCollectionRequest = Schema.Schema.Type<typeof StartCollectionSchema>;
export const StartCollectionRequest =
	Data.tagged<StartCollectionRequest>('StartCollection');

type TracksBatchRequest = Schema.Schema.Type<typeof TracksBatchSchema>;
export const TracksBatchRequest =
	Data.tagged<TracksBatchRequest>('TracksBatch');

type CollectionCompleteRequest = Schema.Schema.Type<
	typeof CollectionCompleteSchema
>;
export const CollectionCompleteRequest =
	Data.tagged<CollectionCompleteRequest>('CollectionComplete');

type CollectionErrorRequest = Schema.Schema.Type<typeof CollectionErrorSchema>;
export const CollectionErrorRequest =
	Data.tagged<CollectionErrorRequest>('CollectionError');

type CancelCollectionRequest = Schema.Schema.Type<
	typeof CancelCollectionSchema
>;
export const CancelCollectionRequest =
	Data.tagged<CancelCollectionRequest>('CancelCollection');

type DownloadExportRequest = Schema.Schema.Type<typeof DownloadExportSchema>;
export const DownloadExportRequest =
	Data.tagged<DownloadExportRequest>('DownloadExport');

type GetStateRequest = Schema.Schema.Type<typeof GetStateSchema>;
export const GetStateRequest = Data.tagged<GetStateRequest>('GetState');

// --- Type guards (Schema.is) ---

export const isGetStateRequest = Schema.is(GetStateSchema);
export const isStartCollection = Schema.is(StartCollectionSchema);
export const isTracksBatch = Schema.is(TracksBatchSchema);
export const isCollectionComplete = Schema.is(CollectionCompleteSchema);
export const isCollectionError = Schema.is(CollectionErrorSchema);
export const isCancelCollection = Schema.is(CancelCollectionSchema);
export const isDownloadExport = Schema.is(DownloadExportSchema);

/** Returns the message tag string for logging; no _tag at call site. */
export function getRequestMessageTagForLog(message: RequestMessage): string {
	return message._tag;
}
