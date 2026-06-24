import { Context, Effect, Layer } from 'effect';
import {
	collectBatch,
	type CollectionBatch,
	type CollectionScanState,
} from '@/content/model/collect-batches';
import { LIKES_PAGE_BASE_URL } from '@/content/constants';
import type { LayoutCollectionContext } from '@/layout';
import {
	isErrorIndicatorPresent as isErrorIndicatorPresentInDom,
	isLoadingIndicatorPresent as isLoadingIndicatorPresentInDom,
	RETRY_BUTTON,
} from '@/layout';

export interface DomScanner {
	readonly scanBatch: (state: CollectionScanState) => Effect.Effect<{
		batch: CollectionBatch;
		nextState: CollectionScanState;
	}>;
	readonly isLoadingIndicatorPresent: () => Effect.Effect<boolean>;
	readonly isErrorIndicatorPresent: () => Effect.Effect<boolean>;
	readonly clickRetry: () => Effect.Effect<void>;
}

export class DomScannerTag extends Context.Tag('DomScanner')<
	DomScannerTag,
	DomScanner
>() {}

export function makeDomScannerLive(
	root: Element,
	layoutContext: LayoutCollectionContext,
): Layer.Layer<DomScannerTag> {
	return Layer.succeed(DomScannerTag, {
		scanBatch: (state) =>
			Effect.promise(() =>
				collectBatch(root, LIKES_PAGE_BASE_URL, state, layoutContext),
			),
		isLoadingIndicatorPresent: () =>
			Effect.sync(() => {
				const scope = root.ownerDocument;
				return isLoadingIndicatorPresentInDom(scope);
			}),
		isErrorIndicatorPresent: () =>
			Effect.sync(() => {
				const scope = root.ownerDocument;
				return isErrorIndicatorPresentInDom(scope);
			}),
		clickRetry: () =>
			Effect.sync(() => {
				const scope = root.ownerDocument;
				const el = scope.querySelector(RETRY_BUTTON);
				if (el instanceof HTMLElement) {
					el.click();
				}
			}),
	});
}
