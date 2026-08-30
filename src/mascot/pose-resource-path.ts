import type { BeatPoseKey } from '@/mascot/persona';

const POSE_RESOURCE_PATHS: Readonly<Record<BeatPoseKey, string>> = {
	idle: 'mascot/idle.webp',
	working: 'mascot/working.webp',
	happy: 'mascot/happy.webp',
	sad: 'mascot/sad.webp',
};

export function poseResourcePath(pose: BeatPoseKey): string {
	return POSE_RESOURCE_PATHS[pose];
}
