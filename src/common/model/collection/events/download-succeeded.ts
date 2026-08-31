import { taggedStruct } from '@/common/model/tagged-struct';
import { Data, Schema } from 'effect';

const DownloadSucceededEventSchema = taggedStruct('DownloadSucceeded');

export type DownloadSucceeded = Schema.Schema.Type<
	typeof DownloadSucceededEventSchema
>;

export const DownloadSucceeded =
	Data.tagged<DownloadSucceeded>('DownloadSucceeded');

export const isDownloadSucceededEvent = Schema.is(DownloadSucceededEventSchema);
