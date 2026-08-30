import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveMascotPoseUrl } from '@/common/infrastructure/resolve-mascot-pose-url';
import type { BeatPoseKey } from '@/mascot/persona';

const POSE_KEYS: readonly BeatPoseKey[] = ['idle', 'working', 'happy', 'sad'];

describe('resolveMascotPoseUrl', () => {
	afterEach(() => {
		Reflect.deleteProperty(globalThis, 'chrome');
	});

	it('returns chrome.runtime.getURL for every pose WebP path', () => {
		const getURL = vi.fn((path: string) => `chrome-extension://test/${path}`);
		Object.defineProperty(globalThis, 'chrome', {
			configurable: true,
			writable: true,
			value: { runtime: { getURL } },
		});

		for (const pose of POSE_KEYS) {
			expect(resolveMascotPoseUrl(pose)).toBe(
				`chrome-extension://test/mascot/${pose}.webp`,
			);
		}

		for (const pose of POSE_KEYS) {
			expect(getURL).toHaveBeenCalledWith(`mascot/${pose}.webp`);
		}
		expect(getURL).toHaveBeenCalledTimes(POSE_KEYS.length);
	});
});
