import { taggedStruct } from '@/common/model/tagged-struct';
import { TrackSchema } from '@/common/model/track';
import { Data, Schema } from 'effect';

export const SavingStateSchema = taggedStruct('Saving', {
	tracks: Schema.Array(TrackSchema),
	skippedTrackCount: Schema.Number,
});

export type Saving = Schema.Schema.Type<typeof SavingStateSchema>;

export const Saving = Data.tagged<Saving>('Saving');

export const isSaving = Schema.is(SavingStateSchema);
