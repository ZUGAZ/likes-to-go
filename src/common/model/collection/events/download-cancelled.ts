import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

const DownloadCancelledEventSchema = taggedStruct('DownloadCancelled');

export type DownloadCancelled = Schema.Schema.Type<
	typeof DownloadCancelledEventSchema
>;

export const DownloadCancelled =
	Data.tagged<DownloadCancelled>('DownloadCancelled');

export const isDownloadCancelledEvent = Schema.is(DownloadCancelledEventSchema);
