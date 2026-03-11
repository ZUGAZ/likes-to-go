import { taggedStruct } from '@/common/model/tagged-struct';
import { TrackSchema } from '@/common/model/track';
import { Data, Schema } from 'effect';

export const DownloadExportCommandSchema = taggedStruct('DownloadExport', {
	tracks: Schema.Array(TrackSchema),
});

export type DownloadExportCommand = Schema.Schema.Type<
	typeof DownloadExportCommandSchema
>;

export const DownloadExportCommand =
	Data.tagged<DownloadExportCommand>('DownloadExport');

export const isDownloadExportCommand = Schema.is(DownloadExportCommandSchema);
