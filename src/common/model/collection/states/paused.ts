import { taggedStruct } from '@/common/model/tagged-struct';
import { TrackSchema } from '@/common/model/track';
import { Data, Schema } from 'effect';

export const PausedStateSchema = taggedStruct('Paused', {
	sourceUrl: Schema.String,
	tabId: Schema.Number,
	tracks: Schema.Array(TrackSchema),
	skippedTrackCount: Schema.Number,
});

export type Paused = Schema.Schema.Type<typeof PausedStateSchema>;

export const Paused = Data.tagged<Paused>('Paused');

export const isPaused = Schema.is(PausedStateSchema);
