import type { LayoutDetector } from '@/layout/model/layout-detector';

const LIST_TRACK_CARD = '.soundList__item';

export const listLayoutDetector: LayoutDetector = {
	layout: 'List',
	detectInContainer: (container) =>
		container.querySelector(LIST_TRACK_CARD) !== null,
};
