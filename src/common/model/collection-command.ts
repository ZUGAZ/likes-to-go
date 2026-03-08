import { Data, Schema } from 'effect';
import { taggedStruct } from '@/common/model/tagged-struct';
import { TrackSchema } from '@/common/model/track';

const CreateTabSchema = taggedStruct('CreateTab', { url: Schema.String });
const CloseTabSchema = taggedStruct('CloseTab', { tabId: Schema.Number });
const SendStartToTabSchema = taggedStruct('SendStartToTab', {
	tabId: Schema.Number,
});
const DownloadExportCommandSchema = taggedStruct('DownloadExport', {
	tracks: Schema.Array(TrackSchema),
});

export const CollectionCommandSchema = Schema.Union(
	CreateTabSchema,
	CloseTabSchema,
	SendStartToTabSchema,
	DownloadExportCommandSchema,
);

export type CollectionCommand = Schema.Schema.Type<
	typeof CollectionCommandSchema
>;

type CreateTab = Schema.Schema.Type<typeof CreateTabSchema>;
export const CreateTab = Data.tagged<CreateTab>('CreateTab');

type CloseTab = Schema.Schema.Type<typeof CloseTabSchema>;
export const CloseTab = Data.tagged<CloseTab>('CloseTab');

type SendStartToTab = Schema.Schema.Type<typeof SendStartToTabSchema>;
export const SendStartToTab = Data.tagged<SendStartToTab>('SendStartToTab');

type DownloadExportCommand = Schema.Schema.Type<
	typeof DownloadExportCommandSchema
>;
export const DownloadExportCommand =
	Data.tagged<DownloadExportCommand>('DownloadExport');

export const isCreateTab = Schema.is(CreateTabSchema);
export const isCloseTab = Schema.is(CloseTabSchema);
export const isSendStartToTab = Schema.is(SendStartToTabSchema);
export const isDownloadExportCommand = Schema.is(DownloadExportCommandSchema);
