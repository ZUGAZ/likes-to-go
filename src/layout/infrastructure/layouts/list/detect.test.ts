import { describe, expect, it } from '@effect/vitest';
import { listLayoutDetector } from '@/layout/infrastructure/layouts/list/detect';

function createContainer(innerHTML: string): Element {
	const container = document.createElement('ul');
	container.className = 'lazyLoadingList__list';
	container.innerHTML = innerHTML;
	return container;
}

describe('listLayoutDetector', () => {
	it('returns true when soundList__item is present', () => {
		const container = createContainer(
			'<li class="soundList__item"><div class="sound"></div></li>',
		);
		expect(listLayoutDetector.detectInContainer(container)).toBe(true);
	});

	it('returns false for an empty container', () => {
		const container = createContainer('');
		expect(listLayoutDetector.detectInContainer(container)).toBe(false);
	});
});
