import type { LayoutDetector } from '@/layout/model/layout-detector';
import { listSelectorSet } from '@/layout/infrastructure/layouts/list';

export const listLayoutDetector: LayoutDetector = {
	layout: 'List',
	detectInContainer: (container) =>
		container.querySelector(listSelectorSet.trackCard) !== null,
};
