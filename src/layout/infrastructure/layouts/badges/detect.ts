import type { LayoutDetector } from '@/layout/model/layout-detector';
import { badgesSelectorSet } from '@/layout/infrastructure/layouts/badges';

export const badgesLayoutDetector: LayoutDetector = {
	layout: 'Badges',
	detectInContainer: (container) =>
		container.querySelector(badgesSelectorSet.trackCard) !== null,
};
