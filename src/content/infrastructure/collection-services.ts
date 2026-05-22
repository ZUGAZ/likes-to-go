import { Layer } from 'effect';
import {
	BackgroundSenderLive,
	BackgroundSenderTag,
} from '@/content/infrastructure/background-sender';
import {
	DomScannerTag,
	makeDomScannerLive,
} from '@/content/infrastructure/dom-scanner';
import {
	DocumentVisibilityLive,
	DocumentVisibilityTag,
} from '@/content/infrastructure/document-visibility';
import { ScrollerLive, ScrollerTag } from '@/content/infrastructure/scroller';

export {
	BackgroundSenderTag,
	type BackgroundSender,
} from '@/content/infrastructure/background-sender';
export { SendToBackgroundFailed } from '@/common/infrastructure/send-to-background';
export {
	DomScannerTag,
	type DomScanner,
} from '@/content/infrastructure/dom-scanner';
export {
	DocumentVisibilityTag,
	type DocumentVisibility,
} from '@/content/infrastructure/document-visibility';
export { ScrollerTag, type Scroller } from '@/content/infrastructure/scroller';

export function makeCollectionLive(
	root: Element,
): Layer.Layer<
	DomScannerTag | BackgroundSenderTag | ScrollerTag | DocumentVisibilityTag
> {
	return Layer.mergeAll(
		makeDomScannerLive(root),
		BackgroundSenderLive,
		ScrollerLive,
		DocumentVisibilityLive,
	);
}
