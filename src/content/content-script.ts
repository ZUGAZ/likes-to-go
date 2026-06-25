import { Effect } from 'effect';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';

import { mountBeatOverlay } from '@/content/beat-overlay/mount-beat-overlay';
import { createContentMessageHandler } from '@/content/content-message-handler';
import { makeContentRuntime } from '@/content/runtime/content-runtime';
import { createMascotVisibility } from '@/mascot/visibility';

export async function initContentScript(
	ctx: ContentScriptContext,
): Promise<void> {
	const visibility = createMascotVisibility(false);

	const program = Effect.scoped(
		Effect.gen(function* () {
			const runtime = yield* makeContentRuntime();
			const overlay = yield* Effect.promise(() =>
				mountBeatOverlay(ctx, runtime, visibility),
			);

			const handler = createContentMessageHandler(runtime, ctx, {
				onToggleMascot: visibility.toggle,
			});

			chrome.runtime.onMessage.addListener(handler);

			ctx.onInvalidated(() => {
				overlay.remove();
			});

			yield* Effect.never;
		}),
	);

	await Effect.runPromise(program);
}
