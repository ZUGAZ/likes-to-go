import {
	handlePopupPortConnectedEffect,
	handlePopupPortDisconnectedEffect,
} from '@/background/overlay-handoff';
import { registerPopupPortConnectListener } from '@/background/infrastructure/popup-port';
import type { BackgroundEnv } from '@/background/runtime/background-env';
import { Runtime } from 'effect';

export function registerPopupPortListener(
	runtime: Runtime.Runtime<BackgroundEnv>,
): void {
	registerPopupPortConnectListener(
		() => {
			void Runtime.runPromise(runtime)(handlePopupPortConnectedEffect());
		},
		() => {
			void Runtime.runPromise(runtime)(handlePopupPortDisconnectedEffect());
		},
	);
}
