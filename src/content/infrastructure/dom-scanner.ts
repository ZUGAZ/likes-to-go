import { Context, Effect, Layer } from 'effect';
import {
	collectBatch,
	type CollectionBatch,
	type CollectionScanState,
} from '@/content/model/collect-batches';
import { LIKES_PAGE_BASE_URL } from '@/content/constants';

export interface DomScanner {
	readonly scanBatch: (
		state: CollectionScanState,
	) => Effect.Effect<{
		batch: CollectionBatch;
		nextState: CollectionScanState;
	}>;
}

export class DomScannerTag extends Context.Tag('DomScanner')<
	DomScannerTag,
	DomScanner
>() {}

export function makeDomScannerLive(root: Element): Layer.Layer<DomScannerTag> {
	return Layer.succeed(DomScannerTag, {
		scanBatch: (state) =>
			Effect.sync(() => collectBatch(root, LIKES_PAGE_BASE_URL, state)),
	});
}
