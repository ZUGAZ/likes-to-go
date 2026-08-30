import { describe, expect, it } from 'vitest';

import type { BeatPoseKey } from '@/mascot/persona';
import { poseResourcePath } from '@/mascot/pose-resource-path';

const POSE_KEYS: readonly BeatPoseKey[] = ['idle', 'working', 'happy', 'sad'];

describe('poseResourcePath', () => {
	it('maps every pose key to mascot/<pose>.webp', () => {
		for (const pose of POSE_KEYS) {
			expect(poseResourcePath(pose)).toBe(`mascot/${pose}.webp`);
		}
	});
});
