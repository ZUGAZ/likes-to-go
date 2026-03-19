import { Context, Effect, Layer } from 'effect';
import {
	collectBatch,
	type CollectionBatch,
	type CollectionScanState,
} from '@/content/model/collect-batches';
import { LIKES_PAGE_BASE_URL } from '@/content/constants';
import { isLoadingIndicatorPresent as isLoadingIndicatorPresentInDom } from '@/common/infrastructure/selectors';

export interface DomScanner {
	readonly scanBatch: (state: CollectionScanState) => Effect.Effect<{
		batch: CollectionBatch;
		nextState: CollectionScanState;
	}>;
	readonly isLoadingIndicatorPresent: () => Effect.Effect<boolean>;
}

export class DomScannerTag extends Context.Tag('DomScanner')<
	DomScannerTag,
	DomScanner
>() {}

export function makeDomScannerLive(root: Element): Layer.Layer<DomScannerTag> {
	return Layer.succeed(DomScannerTag, {
		scanBatch: (state) =>
			Effect.sync(() => collectBatch(root, LIKES_PAGE_BASE_URL, state)),
		isLoadingIndicatorPresent: () =>
			Effect.sync(() => {
				const scope = root.ownerDocument;
				return isLoadingIndicatorPresentInDom(scope);
			}),
	});
}
