import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

const DownloadExportEventSchema = taggedStruct('DownloadExport');

export type DownloadExport = Schema.Schema.Type<
	typeof DownloadExportEventSchema
>;

export const DownloadExport = Data.tagged<DownloadExport>('DownloadExport');

export const isDownloadExportEvent = Schema.is(DownloadExportEventSchema);
