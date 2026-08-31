import { ExportFormatIdSchema } from '@/common/model/export-format/export-format-id';
import { taggedStruct } from '@/common/model/tagged-struct';
import { TrackSchema } from '@/common/model/track';
import { Data, Schema } from 'effect';
import { type ShowMascot, ShowMascotSchema } from './show-mascot';
import { type ToggleMascot, ToggleMascotSchema } from './toggle-mascot';

// --- Request message schemas (discriminated union) ---

const StartCollectionSchema = taggedStruct('StartCollection');
const TracksBatchSchema = taggedStruct('TracksBatch', {
	tracks: Schema.Array(TrackSchema),
	skippedTrackCount: Schema.Number,
});
const CollectionCompleteSchema = taggedStruct('CollectionComplete');
const CollectionVisibilityPausedSchema = taggedStruct(
	'CollectionVisibilityPaused',
);
const CollectionVisibilityResumedSchema = taggedStruct(
	'CollectionVisibilityResumed',
);
const CollectionErrorSchema = taggedStruct('CollectionError', {
	message: Schema.String,
	reason: Schema.String,
});
const CancelCollectionSchema = taggedStruct('CancelCollection');
export const DownloadExportSchema = taggedStruct('DownloadExport', {
	format: Schema.optional(ExportFormatIdSchema),
});
const DownloadSucceededSchema = taggedStruct('DownloadSucceeded');
const DownloadCancelledSchema = taggedStruct('DownloadCancelled');
const DownloadFailedRequestSchema = taggedStruct('DownloadFailed', {
	message: Schema.String,
	reason: Schema.String,
});
const GetStateSchema = taggedStruct('GetState');
const LoginRequiredSchema = taggedStruct('LoginRequired', {
	message: Schema.String,
	reason: Schema.String,
});

export const RequestMessageSchema = Schema.Union(
	StartCollectionSchema,
	TracksBatchSchema,
	CollectionCompleteSchema,
	CollectionVisibilityPausedSchema,
	CollectionVisibilityResumedSchema,
	CollectionErrorSchema,
	CancelCollectionSchema,
	DownloadExportSchema,
	DownloadSucceededSchema,
	DownloadCancelledSchema,
	DownloadFailedRequestSchema,
	GetStateSchema,
	LoginRequiredSchema,
	ToggleMascotSchema,
	ShowMascotSchema,
);

export type RequestMessage = Schema.Schema.Type<typeof RequestMessageSchema>;

/** Messages that may be sent to the background service worker. ToggleMascot and ShowMascot are content-only. */
export type BackgroundRequestMessage = Exclude<
	RequestMessage,
	ToggleMascot | ShowMascot
>;

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

type CollectionVisibilityPausedRequest = Schema.Schema.Type<
	typeof CollectionVisibilityPausedSchema
>;
export const CollectionVisibilityPausedRequest =
	Data.tagged<CollectionVisibilityPausedRequest>('CollectionVisibilityPaused');

type CollectionVisibilityResumedRequest = Schema.Schema.Type<
	typeof CollectionVisibilityResumedSchema
>;
export const CollectionVisibilityResumedRequest =
	Data.tagged<CollectionVisibilityResumedRequest>(
		'CollectionVisibilityResumed',
	);

type CollectionErrorRequest = Schema.Schema.Type<typeof CollectionErrorSchema>;
export const CollectionErrorRequest =
	Data.tagged<CollectionErrorRequest>('CollectionError');

type CancelCollectionRequest = Schema.Schema.Type<
	typeof CancelCollectionSchema
>;
export const CancelCollectionRequest =
	Data.tagged<CancelCollectionRequest>('CancelCollection');

type DownloadExportRequest = Schema.Schema.Type<typeof DownloadExportSchema>;
const makeDownloadExportRequest =
	Data.tagged<DownloadExportRequest>('DownloadExport');
export function DownloadExportRequest(
	fields: Omit<DownloadExportRequest, '_tag'> = {},
): DownloadExportRequest {
	return makeDownloadExportRequest(fields);
}

type DownloadSucceededRequest = Schema.Schema.Type<
	typeof DownloadSucceededSchema
>;
export const DownloadSucceededRequest =
	Data.tagged<DownloadSucceededRequest>('DownloadSucceeded');

type DownloadCancelledRequest = Schema.Schema.Type<
	typeof DownloadCancelledSchema
>;
export const DownloadCancelledRequest =
	Data.tagged<DownloadCancelledRequest>('DownloadCancelled');

type DownloadFailedRequest = Schema.Schema.Type<
	typeof DownloadFailedRequestSchema
>;
export const DownloadFailedRequest =
	Data.tagged<DownloadFailedRequest>('DownloadFailed');

type GetStateRequest = Schema.Schema.Type<typeof GetStateSchema>;
export const GetStateRequest = Data.tagged<GetStateRequest>('GetState');

type LoginRequiredRequest = Schema.Schema.Type<typeof LoginRequiredSchema>;
export const LoginRequiredRequest =
	Data.tagged<LoginRequiredRequest>('LoginRequired');

// --- Type guards (Schema.is) ---

export const isGetStateRequest = Schema.is(GetStateSchema);
export const isStartCollection = Schema.is(StartCollectionSchema);
export const isTracksBatch = Schema.is(TracksBatchSchema);
export const isCollectionComplete = Schema.is(CollectionCompleteSchema);
export const isCollectionVisibilityPaused = Schema.is(
	CollectionVisibilityPausedSchema,
);
export const isCollectionVisibilityResumed = Schema.is(
	CollectionVisibilityResumedSchema,
);
export const isCollectionError = Schema.is(CollectionErrorSchema);
export const isCancelCollection = Schema.is(CancelCollectionSchema);
export const isDownloadExport = Schema.is(DownloadExportSchema);
export const isDownloadSucceeded = Schema.is(DownloadSucceededSchema);
export const isDownloadCancelled = Schema.is(DownloadCancelledSchema);
export const isDownloadFailedRequest = Schema.is(DownloadFailedRequestSchema);
export const isLoginRequired = Schema.is(LoginRequiredSchema);
