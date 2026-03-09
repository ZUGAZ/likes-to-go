import { Runtime } from 'effect';
import { registerRuntimeListener } from '@/common/infrastructure/chrome-messaging';
import { handleMessageEffect } from '@/background/background-dispatch';
import type { BackgroundEnv } from '@/background/runtime/background-env';

export function registerMessageListener(
	runtime: Runtime.Runtime<BackgroundEnv>,
): void {
	registerRuntimeListener((message, sender) =>
		Runtime.runPromise(runtime)(handleMessageEffect(message, sender)),
	);
}
