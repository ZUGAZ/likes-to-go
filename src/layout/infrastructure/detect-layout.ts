import type { Layout } from '@/layout/model/layout';
import type { LayoutDetector } from '@/layout/model/layout-detector';
import { badgesLayoutDetector } from '@/layout/infrastructure/layouts/badges/detect';
import { listLayoutDetector } from '@/layout/infrastructure/layouts/list/detect';
import { TRACK_LIST_CONTAINER } from '@/layout/infrastructure/selectors/shared';

const layoutDetectors: readonly LayoutDetector[] = [
	badgesLayoutDetector,
	listLayoutDetector,
];

export function detectLayoutInContainer(container: Element): Layout {
	const matches = layoutDetectors.filter((d) => d.detectInContainer(container));
	const [soleMatch] = matches;
	if (matches.length === 1 && soleMatch !== undefined) return soleMatch.layout;
	return 'Unknown';
}

export function detectLayout(pageDocument: Document): Layout {
	const container = pageDocument.querySelector(TRACK_LIST_CONTAINER);
	if (container === null) return 'Unknown';
	return detectLayoutInContainer(container);
}

export function isSupportedLayout(
	layout: Layout,
): layout is Exclude<Layout, 'Unknown'> {
	return layout !== 'Unknown';
}
