import { handleMessageEffect } from '@/background/background-dispatch';
import { DispatchLaneTag } from '@/background/dispatch-lane';
import type { BackgroundEnv } from '@/background/runtime/background-env';
import { registerRuntimeListener } from '@/common/infrastructure/chrome-messaging';
import { Effect, Runtime } from 'effect';

export function registerMessageListener(
	runtime: Runtime.Runtime<BackgroundEnv>,
): void {
	registerRuntimeListener((message, sender) =>
		Runtime.runPromise(runtime)(
			Effect.flatMap(DispatchLaneTag, (lane) =>
				lane.submitAndAwait(handleMessageEffect(message, sender)),
			),
		),
	);
}
