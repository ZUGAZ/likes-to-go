import type { BeatPoseKey } from '@/mascot/persona';
import { poseResourcePath } from '@/mascot/pose-resource-path';

/** Storybook static-dir resolver. No chrome. */
export function resolveStorybookMascotPoseUrl(pose: BeatPoseKey): string {
	return `/${poseResourcePath(pose)}`;
}
