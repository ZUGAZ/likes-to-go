import { Effect } from 'effect';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';

import { mountBeatOverlay } from '@/content/beat-overlay/mount-beat-overlay';
import { createContentMessageHandler } from '@/content/content-message-handler';
import { makeContentRuntime } from '@/content/runtime/content-runtime';
import { createLoggedMascotVisibility } from '@/mascot/visibility-logging';

export async function initContentScript(
	ctx: ContentScriptContext,
): Promise<void> {
	const program = Effect.scoped(
		Effect.gen(function* () {
			const runtime = yield* makeContentRuntime();
			const visibility = createLoggedMascotVisibility(runtime, false);

			const handler = createContentMessageHandler(runtime, ctx, {
				onToggleMascot: visibility.toggle,
				isMascotVisible: visibility.isVisible,
			});

			chrome.runtime.onMessage.addListener(handler);
			yield* Effect.log('content message listener registered');

			const overlay = yield* Effect.promise(() =>
				mountBeatOverlay(ctx, runtime, visibility),
			);
			yield* Effect.log('beat overlay mounted');

			ctx.onInvalidated(() => {
				overlay.remove();
			});

			yield* Effect.never;
		}),
	);

	await Effect.runPromise(program);
}
