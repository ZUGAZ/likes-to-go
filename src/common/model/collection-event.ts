import { Data, Schema } from 'effect';
import { taggedStruct } from '@/common/model/tagged-struct';
import { TrackSchema } from '@/common/model/track';

const StartCollectionEventSchema = taggedStruct('StartCollection');
const TabCreatedSchema = taggedStruct('TabCreated', { tabId: Schema.Number });
const TabCreateFailedSchema = taggedStruct('TabCreateFailed', {
	message: Schema.String,
});
const TracksBatchEventSchema = taggedStruct('TracksBatch', {
	tracks: Schema.Array(TrackSchema),
});
const CollectionCompleteEventSchema = taggedStruct('CollectionComplete');
const CollectionErrorEventSchema = taggedStruct('CollectionError', {
	message: Schema.String,
});
const CancelCollectionEventSchema = taggedStruct('CancelCollection');
const DownloadExportEventSchema = taggedStruct('DownloadExport');
const TabCompleteSchema = taggedStruct('TabComplete', { tabId: Schema.Number });
const SendToTabFailedSchema = taggedStruct('SendToTabFailed', {
	message: Schema.String,
});
const DownloadFailedSchema = taggedStruct('DownloadFailed', {
	message: Schema.String,
});

export const CollectionEventSchema = Schema.Union(
	StartCollectionEventSchema,
	TabCreatedSchema,
	TabCreateFailedSchema,
	TracksBatchEventSchema,
	CollectionCompleteEventSchema,
	CollectionErrorEventSchema,
	CancelCollectionEventSchema,
	DownloadExportEventSchema,
	TabCompleteSchema,
	SendToTabFailedSchema,
	DownloadFailedSchema,
);

export type CollectionEvent = Schema.Schema.Type<typeof CollectionEventSchema>;

type StartCollection = Schema.Schema.Type<typeof StartCollectionEventSchema>;
export const StartCollection = Data.tagged<StartCollection>('StartCollection');

type TabCreated = Schema.Schema.Type<typeof TabCreatedSchema>;
export const TabCreated = Data.tagged<TabCreated>('TabCreated');

type TabCreateFailed = Schema.Schema.Type<typeof TabCreateFailedSchema>;
export const TabCreateFailed = Data.tagged<TabCreateFailed>('TabCreateFailed');

type TracksBatch = Schema.Schema.Type<typeof TracksBatchEventSchema>;
export const TracksBatch = Data.tagged<TracksBatch>('TracksBatch');

type CollectionComplete = Schema.Schema.Type<
	typeof CollectionCompleteEventSchema
>;
export const CollectionComplete =
	Data.tagged<CollectionComplete>('CollectionComplete');

type CollectionError = Schema.Schema.Type<typeof CollectionErrorEventSchema>;
export const CollectionError = Data.tagged<CollectionError>('CollectionError');

type CancelCollection = Schema.Schema.Type<typeof CancelCollectionEventSchema>;
export const CancelCollection =
	Data.tagged<CancelCollection>('CancelCollection');

type DownloadExport = Schema.Schema.Type<typeof DownloadExportEventSchema>;
export const DownloadExport = Data.tagged<DownloadExport>('DownloadExport');

type TabComplete = Schema.Schema.Type<typeof TabCompleteSchema>;
export const TabComplete = Data.tagged<TabComplete>('TabComplete');

type SendToTabFailed = Schema.Schema.Type<typeof SendToTabFailedSchema>;
export const SendToTabFailed = Data.tagged<SendToTabFailed>('SendToTabFailed');

type DownloadFailed = Schema.Schema.Type<typeof DownloadFailedSchema>;
export const DownloadFailed = Data.tagged<DownloadFailed>('DownloadFailed');

export const isStartCollectionEvent = Schema.is(StartCollectionEventSchema);
export const isTabCreated = Schema.is(TabCreatedSchema);
export const isTabCreateFailed = Schema.is(TabCreateFailedSchema);
export const isTracksBatchEvent = Schema.is(TracksBatchEventSchema);
export const isCollectionCompleteEvent = Schema.is(
	CollectionCompleteEventSchema,
);
export const isCollectionErrorEvent = Schema.is(CollectionErrorEventSchema);
export const isCancelCollectionEvent = Schema.is(CancelCollectionEventSchema);
export const isDownloadExportEvent = Schema.is(DownloadExportEventSchema);
export const isTabComplete = Schema.is(TabCompleteSchema);
export const isSendToTabFailed = Schema.is(SendToTabFailedSchema);
export const isDownloadFailedEvent = Schema.is(DownloadFailedSchema);

export function getCollectionEventTag(event: CollectionEvent): string {
	if (isStartCollectionEvent(event)) return 'StartCollection';
	if (isTabCreated(event)) return 'TabCreated';
	if (isTabCreateFailed(event)) return 'TabCreateFailed';
	if (isTracksBatchEvent(event)) return 'TracksBatch';
	if (isCollectionCompleteEvent(event)) return 'CollectionComplete';
	if (isCollectionErrorEvent(event)) return 'CollectionError';
	if (isCancelCollectionEvent(event)) return 'CancelCollection';
	if (isDownloadExportEvent(event)) return 'DownloadExport';
	if (isTabComplete(event)) return 'TabComplete';
	if (isSendToTabFailed(event)) return 'SendToTabFailed';
	if (isDownloadFailedEvent(event)) return 'DownloadFailed';
	return 'Unknown';
}
