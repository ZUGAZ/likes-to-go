import { getPopupSource } from '@/background/source';
import { SourceSelected } from '@/common/model/collection/events/source-selected';
import { Effect } from 'effect';

export function runCheckSource(): Effect.Effect<SourceSelected> {
	return getPopupSource().pipe(
		Effect.map((source) => SourceSelected({ source })),
		Effect.withLogSpan('runCheckSource'),
	);
}
