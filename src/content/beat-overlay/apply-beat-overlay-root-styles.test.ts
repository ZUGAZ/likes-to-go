import { describe, expect, it } from 'vitest';

import { applyBeatOverlayRootStyles } from '@/content/beat-overlay/apply-beat-overlay-root-styles';

describe('applyBeatOverlayRootStyles', () => {
	it('marks shadow html for CSS positioning and clears inline placement', () => {
		const shadowHost = document.createElement('likes-to-go-beat');
		const shadow = shadowHost.attachShadow({ mode: 'open' });
		const shadowHtml = document.createElement('html');
		shadowHtml.style.position = 'absolute';
		shadowHtml.style.top = '0rem';
		shadowHtml.style.right = '0rem';
		shadow.append(shadowHtml);

		applyBeatOverlayRootStyles(shadow);

		expect(shadowHtml.classList.contains('beat-overlay-root')).toBe(true);
		expect(shadowHost.classList.contains('beat-overlay-root')).toBe(false);
		expect(shadowHtml.style.position).toBe('');
		expect(shadowHtml.style.top).toBe('');
		expect(shadowHtml.style.right).toBe('');
	});
});
