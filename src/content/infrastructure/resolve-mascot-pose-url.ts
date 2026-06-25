import type { BeatPoseKey } from '@/mascot/persona';

const POSE_RESOURCE_PATHS: Readonly<Record<BeatPoseKey, string>> = {
	idle: 'mascot/idle.png',
	working: 'mascot/working.png',
	happy: 'mascot/happy.png',
	sad: 'mascot/sad.png',
};

export function resolveContentMascotPoseUrl(pose: BeatPoseKey): string {
	return chrome.runtime.getURL(POSE_RESOURCE_PATHS[pose]);
}
