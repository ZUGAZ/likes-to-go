import { Effect, Runtime } from 'effect';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';

import { SpanLoggerLive } from '@/common/infrastructure/logger';
import { mountBeatOverlay } from '@/content/beat-overlay/mount-beat-overlay';
import { makeContentLayer } from '@/content/runtime/content-layer';
import { ContentLifetimeTag } from '@/content/runtime/content-lifetime';
import { makeContentRuntime } from '@/content/runtime/content-runtime';
import type { ContentEnv } from '@/content/runtime/content-env';
import {
	createMascotVisibility,
	type MascotVisibilityTransition,
} from '@/mascot/visibility';
import {
	PageLifecycleLive,
	PortConnectorLive,
} from 'browser-extension-kit/messaging';

function logOverlayVisibility(
	action: MascotVisibilityTransition,
	visible: boolean,
): Effect.Effect<void> {
	return Effect.log('overlay visibility', { action, visible }).pipe(
		Effect.withLogSpan('overlayVisibility'),
	);
}

export async function initContentScript(
	ctx: ContentScriptContext,
): Promise<void> {
	const runtimeBox: { current: Runtime.Runtime<ContentEnv> | undefined } = {
		current: undefined,
	};
	const visibility = createMascotVisibility(false, {
		onTransition: (action, visible) => {
			const runtime = runtimeBox.current;
			if (runtime === undefined) {
				return;
			}
			Runtime.runFork(runtime)(logOverlayVisibility(action, visible));
		},
	});

	const program = Effect.scoped(
		Effect.gen(function* () {
			const runtime = yield* makeContentRuntime(
				makeContentLayer({
					visibility,
					portConnector: PortConnectorLive,
					pageLifecycle: PageLifecycleLive,
					logger: SpanLoggerLive,
				}),
			);
			runtimeBox.current = runtime;

			const overlay = yield* Effect.promise(() =>
				mountBeatOverlay(ctx, runtime, visibility),
			);
			yield* Effect.log('beat overlay mounted').pipe(
				Effect.withLogSpan('initContentScript'),
			);
			yield* Effect.addFinalizer(() => Effect.sync(() => overlay.remove()));

			const lifetime = yield* ContentLifetimeTag.pipe(Effect.provide(runtime));
			ctx.onInvalidated(() => {
				Runtime.runFork(runtime)(lifetime.stop);
			});
			yield* lifetime.stopped;
		}),
	);

	await Effect.runPromise(program);
}
