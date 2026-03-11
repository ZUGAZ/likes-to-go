import { taggedStruct } from '@/common/model/tagged-struct';
import { TrackSchema } from '@/common/model/track';
import { Data, Schema } from 'effect';

export const CollectingStateSchema = taggedStruct('Collecting', {
	tabId: Schema.Number,
	tracks: Schema.Array(TrackSchema),
});

export type Collecting = Schema.Schema.Type<typeof CollectingStateSchema>;

export const Collecting = Data.tagged<Collecting>('Collecting');

export const isCollecting = Schema.is(CollectingStateSchema);
