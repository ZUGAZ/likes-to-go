import { describe, expect, it } from 'vitest';

import { createMascotVisibility } from '@/mascot/visibility';

describe('createMascotVisibility', () => {
	it('starts hidden when initiallyVisible is false', () => {
		const visibility = createMascotVisibility(false);

		expect(visibility.isVisible()).toBe(false);
	});

	it('starts visible when initiallyVisible is true', () => {
		const visibility = createMascotVisibility(true);

		expect(visibility.isVisible()).toBe(true);
	});

	it('summon makes the mascot visible', () => {
		const visibility = createMascotVisibility(false);

		visibility.summon();

		expect(visibility.isVisible()).toBe(true);
	});

	it('dismiss hides the mascot', () => {
		const visibility = createMascotVisibility(true);

		visibility.dismiss();

		expect(visibility.isVisible()).toBe(false);
	});

	it('toggle flips visibility', () => {
		const visibility = createMascotVisibility(false);

		expect(visibility.isVisible()).toBe(false);
		visibility.toggle();
		expect(visibility.isVisible()).toBe(true);
		visibility.toggle();
		expect(visibility.isVisible()).toBe(false);
	});
});
