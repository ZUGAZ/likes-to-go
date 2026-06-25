import idleUrl from '@/assets/mascot/idle.png';
import workingUrl from '@/assets/mascot/working.png';
import happyUrl from '@/assets/mascot/happy.png';
import sadUrl from '@/assets/mascot/sad.png';

import type { BeatPoseKey } from '@/mascot/persona';

const POSE_URL_MAP: Readonly<Record<BeatPoseKey, string>> = {
	idle: idleUrl,
	working: workingUrl,
	happy: happyUrl,
	sad: sadUrl,
};

export function resolveBundledPoseUrl(pose: BeatPoseKey): string {
	return POSE_URL_MAP[pose];
}
