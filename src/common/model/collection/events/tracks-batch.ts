import { taggedStruct } from '@/common/model/tagged-struct';
import { TrackSchema } from '@/common/model/track';
import { Data, Schema } from 'effect';

export const TracksBatchEventSchema = taggedStruct('TracksBatch', {
	tracks: Schema.Array(TrackSchema),
	skippedTrackCount: Schema.Number,
});

export type TracksBatch = Schema.Schema.Type<typeof TracksBatchEventSchema>;

export const TracksBatch = Data.tagged<TracksBatch>('TracksBatch');

export const isTracksBatchEvent = Schema.is(TracksBatchEventSchema);
