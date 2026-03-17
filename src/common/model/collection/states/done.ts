import { taggedStruct } from '@/common/model/tagged-struct';
import { TrackSchema } from '@/common/model/track';
import { Data, Schema } from 'effect';

export const DoneStateSchema = taggedStruct('Done', {
	tracks: Schema.Array(TrackSchema),
	skippedTrackCount: Schema.Number,
});

export type Done = Schema.Schema.Type<typeof DoneStateSchema>;

export const Done = Data.tagged<Done>('Done');

export const isDone = Schema.is(DoneStateSchema);
