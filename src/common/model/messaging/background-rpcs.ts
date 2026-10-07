import { Rpc, RpcGroup } from '@effect/rpc';
import { PortCaller } from 'browser-extension-kit/messaging';
import { Schema } from 'effect';

import { CollectionStatusSchema } from '@/common/model/collection/collection-status';
import { ExportFormatIdSchema } from '@/common/model/export-format/export-format-id';
import { CollectionView } from '@/common/model/messaging/collection-view';
import { TrackSchema } from '@/common/model/track';

/** The collection was not in a state that has an export to save. */
export class ExportUnavailable extends Schema.TaggedError<ExportUnavailable>()(
	'ExportUnavailable',
	{ status: CollectionStatusSchema },
) {}

const failureReportFields = {
	message: Schema.String,
	reason: Schema.String,
};

/** Command from the popup, an extension page, or content. Succeeds when the background accepts it. */
export const StartCollection = Rpc.make('StartCollection');

/** Command from the popup, an extension page, or content. Succeeds when the background accepts it. */
export const CancelCollection = Rpc.make('CancelCollection');

/** Command from the popup, an extension page, or content. Returns the export file text, or fails with `ExportUnavailable`. */
export const DownloadExport = Rpc.make('DownloadExport', {
	payload: { format: ExportFormatIdSchema },
	success: Schema.String,
	error: ExportUnavailable,
});

/** Command from the popup, an extension page, or content. Succeeds when the background accepts it. */
export const DownloadSucceeded = Rpc.make('DownloadSucceeded');

/** Command from the popup, an extension page, or content. Succeeds when the background accepts it. */
export const DownloadCancelled = Rpc.make('DownloadCancelled');

/** Command from the popup, an extension page, or content. Reports a failed save. Succeeds when the background accepts it. */
export const DownloadFailed = Rpc.make('DownloadFailed', {
	payload: failureReportFields,
});

/** Command from the popup, an extension page, or content. Asks the background to re-check source and login (the old GetState side effect); the result arrives through `WatchCollectionState`. */
export const RefreshCollectionState = Rpc.make('RefreshCollectionState');

/** Subscription for the popup, an extension page, or content. Current view first, then every distinct change; projected per caller; served with `watchState(ref, { project: collectionStateToView })`; clients use `subscribeState`. */
export const WatchCollectionState = Rpc.make('WatchCollectionState', {
	success: CollectionView,
	stream: true,
});

/** Fire-and-forget from content. Call with `{ discard: true }`; the caller gets no answer. */
export const TracksBatch = Rpc.make('TracksBatch', {
	payload: {
		tracks: Schema.Array(TrackSchema),
		skippedTrackCount: Schema.Number,
	},
});

/** Fire-and-forget from content. Call with `{ discard: true }`; the caller gets no answer. */
export const CollectionComplete = Rpc.make('CollectionComplete');

/** Fire-and-forget from content. Call with `{ discard: true }`; the caller gets no answer. */
export const CollectionVisibilityPaused = Rpc.make(
	'CollectionVisibilityPaused',
);

/** Fire-and-forget from content. Call with `{ discard: true }`; the caller gets no answer. */
export const CollectionVisibilityResumed = Rpc.make(
	'CollectionVisibilityResumed',
);

/** Fire-and-forget from content. Call with `{ discard: true }`; the caller gets no answer. */
export const CollectionError = Rpc.make('CollectionError', {
	payload: failureReportFields,
});

/** Fire-and-forget from content. Call with `{ discard: true }`; the caller gets no answer. */
export const LoginRequired = Rpc.make('LoginRequired', {
	payload: failureReportFields,
});

/**
 * Served by the background on `BACKGROUND_RPC_PORT_NAME` (`likes-to-go/background`).
 * Handlers can read `Caller`. A void success means the call was accepted;
 * follow-up work runs detached from the request fiber so a closing port cannot cancel it.
 * Transport errors come from `withPortErrors`, not from these schemas.
 */
export class BackgroundRpcs extends RpcGroup.make(
	StartCollection,
	CancelCollection,
	DownloadExport,
	DownloadSucceeded,
	DownloadCancelled,
	DownloadFailed,
	RefreshCollectionState,
	WatchCollectionState,
	TracksBatch,
	CollectionComplete,
	CollectionVisibilityPaused,
	CollectionVisibilityResumed,
	CollectionError,
	LoginRequired,
).middleware(PortCaller) {}
