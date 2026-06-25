import { describe, expect, it, vi } from 'vitest';

import { resolveContentMascotPoseUrl } from '@/content/infrastructure/resolve-mascot-pose-url';

describe('resolveContentMascotPoseUrl', () => {
	it('returns chrome.runtime.getURL for each pose', () => {
		const getURL = vi.fn((path: string) => `chrome-extension://test/${path}`);
		Object.defineProperty(globalThis, 'chrome', {
			configurable: true,
			writable: true,
			value: { runtime: { getURL } },
		});

		expect(resolveContentMascotPoseUrl('idle')).toBe(
			'chrome-extension://test/mascot/idle.png',
		);
		expect(resolveContentMascotPoseUrl('working')).toBe(
			'chrome-extension://test/mascot/working.png',
		);
		expect(getURL).toHaveBeenCalledWith('mascot/idle.png');
	});
});
