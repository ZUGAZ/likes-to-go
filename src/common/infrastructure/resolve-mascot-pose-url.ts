import type { BeatPoseKey } from '@/mascot/persona';
import { poseResourcePath } from '@/mascot/pose-resource-path';

export function resolveMascotPoseUrl(pose: BeatPoseKey): string {
	return chrome.runtime.getURL(poseResourcePath(pose));
}
