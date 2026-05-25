import { describe, expect, it } from '@effect/vitest';
import { UNSUPPORTED_LAYOUT_MESSAGE } from '@/content/model/collection-error-messages';
import {
	detectLayout,
	detectLayoutInContainer,
	isSupportedLayout,
} from '@/layout/infrastructure/detect-layout';

function createContainer(innerHTML: string): Element {
	const container = document.createElement('ul');
	container.className = 'lazyLoadingList__list';
	container.innerHTML = innerHTML;
	return container;
}

function createDocument(
	containerHTML: string,
	includeContainer = true,
): Document {
	const dom = new DOMParser().parseFromString(
		includeContainer
			? `<ul class="lazyLoadingList__list">${containerHTML}</ul>`
			: `<div>${containerHTML}</div>`,
		'text/html',
	);
	return dom;
}

describe('detectLayoutInContainer', () => {
	it('returns Badges when only badge cards are present', () => {
		const container = createContainer(
			'<li class="badgeList__item"><div class="audibleTile"></div></li>',
		);
		expect(detectLayoutInContainer(container)).toBe('Badges');
	});

	it('returns List when only list cards are present', () => {
		const container = createContainer(
			'<li class="soundList__item"><div class="sound"></div></li>',
		);
		expect(detectLayoutInContainer(container)).toBe('List');
	});

	it('returns Unknown when both card types are present', () => {
		const container = createContainer(`
			<li class="badgeList__item"><div class="audibleTile"></div></li>
			<li class="soundList__item"><div class="sound"></div></li>
		`);
		expect(detectLayoutInContainer(container)).toBe('Unknown');
	});

	it('returns Unknown when neither card type is present', () => {
		const container = createContainer('<li class="other__item"></li>');
		expect(detectLayoutInContainer(container)).toBe('Unknown');
	});
});

describe('detectLayout', () => {
	it('returns Unknown when no list container is on the document', () => {
		const dom = createDocument('<li class="badgeList__item"></li>', false);
		expect(detectLayout(dom)).toBe('Unknown');
	});

	it('returns Badges for badges-only markup in the list container', () => {
		const dom = createDocument(
			'<li class="badgeList__item"><div class="audibleTile"></div></li>',
		);
		expect(detectLayout(dom)).toBe('Badges');
	});

	it('returns List for list-only markup in the list container', () => {
		const dom = createDocument(
			'<li class="soundList__item"><div class="sound"></div></li>',
		);
		expect(detectLayout(dom)).toBe('List');
	});
});

describe('isSupportedLayout', () => {
	it('returns true for Badges and List', () => {
		expect(isSupportedLayout('Badges')).toBe(true);
		expect(isSupportedLayout('List')).toBe(true);
	});

	it('returns false for Unknown', () => {
		expect(isSupportedLayout('Unknown')).toBe(false);
	});
});

describe('UNSUPPORTED_LAYOUT_MESSAGE', () => {
	it('mentions switching between Badges and List view', () => {
		expect(UNSUPPORTED_LAYOUT_MESSAGE).toMatch(/Badges/i);
		expect(UNSUPPORTED_LAYOUT_MESSAGE).toMatch(/List/i);
	});
});
