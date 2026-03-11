import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

export const DownloadFailedSchema = taggedStruct('DownloadFailed', {
	message: Schema.String,
});

export type DownloadFailed = Schema.Schema.Type<typeof DownloadFailedSchema>;

export const DownloadFailed = Data.tagged<DownloadFailed>('DownloadFailed');

export const isDownloadFailedEvent = Schema.is(DownloadFailedSchema);
