import { Layer } from 'effect';
import {
	BackgroundSenderLive,
	BackgroundSenderTag,
} from '@/content/infrastructure/background-sender';
import { DomScannerTag, makeDomScannerLive } from '@/content/infrastructure/dom-scanner';
import { ScrollerLive, ScrollerTag } from '@/content/infrastructure/scroller';

export { BackgroundSenderTag, type BackgroundSender, SendError } from '@/content/infrastructure/background-sender';
export { DomScannerTag, type DomScanner } from '@/content/infrastructure/dom-scanner';
export { ScrollerTag, type Scroller } from '@/content/infrastructure/scroller';

export function makeCollectionLive(
	root: Element,
): Layer.Layer<DomScannerTag | BackgroundSenderTag | ScrollerTag> {
	return Layer.mergeAll(
		makeDomScannerLive(root),
		BackgroundSenderLive,
		ScrollerLive,
	);
}
