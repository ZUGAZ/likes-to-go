import { describe, expect, it } from 'vitest';

import type { BeatPoseKey } from '@/mascot/persona';
import { resolveStorybookMascotPoseUrl } from '@/mascot/resolve-storybook-mascot-pose-url';

const POSE_KEYS: readonly BeatPoseKey[] = ['idle', 'working', 'happy', 'sad'];

describe('resolveStorybookMascotPoseUrl', () => {
	it('returns a root-relative WebP path for every pose', () => {
		for (const pose of POSE_KEYS) {
			expect(resolveStorybookMascotPoseUrl(pose)).toBe(`/mascot/${pose}.webp`);
		}
	});
});
