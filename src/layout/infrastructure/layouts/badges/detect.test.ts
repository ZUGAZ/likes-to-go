import { describe, expect, it } from '@effect/vitest';
import { badgesLayoutDetector } from '@/layout/infrastructure/layouts/badges/detect';

function createContainer(innerHTML: string): Element {
	const container = document.createElement('ul');
	container.className = 'lazyLoadingList__list';
	container.innerHTML = innerHTML;
	return container;
}

describe('badgesLayoutDetector', () => {
	it('returns true when badgeList__item is present', () => {
		const container = createContainer(
			'<li class="badgeList__item"><div class="audibleTile"></div></li>',
		);
		expect(badgesLayoutDetector.detectInContainer(container)).toBe(true);
	});

	it('returns false for an empty container', () => {
		const container = createContainer('');
		expect(badgesLayoutDetector.detectInContainer(container)).toBe(false);
	});
});
