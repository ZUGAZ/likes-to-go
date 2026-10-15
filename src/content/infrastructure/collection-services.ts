import type { LayoutCollectionContext } from '@/layout';
import { Layer } from 'effect';
import {
	DomScannerTag,
	makeDomScannerLive,
} from '@/content/infrastructure/dom-scanner';
import {
	DocumentVisibilityLive,
	DocumentVisibilityTag,
} from '@/content/infrastructure/document-visibility';
import { ScrollerLive, ScrollerTag } from '@/content/infrastructure/scroller';

export { BackgroundSenderTag } from '@/content/infrastructure/background-sender';
export { SendToBackgroundFailed } from '@/content/model/send-to-background-failed';
export { DomScannerTag } from '@/content/infrastructure/dom-scanner';
export { DocumentVisibilityTag } from '@/content/infrastructure/document-visibility';
export { ScrollerTag } from '@/content/infrastructure/scroller';

export function makeCollectionLive(
	root: Element,
	layoutContext: LayoutCollectionContext,
): Layer.Layer<DomScannerTag | ScrollerTag | DocumentVisibilityTag> {
	return Layer.mergeAll(
		makeDomScannerLive(root, layoutContext),
		ScrollerLive,
		DocumentVisibilityLive,
	);
}
