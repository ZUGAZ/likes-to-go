import { Effect, Runtime } from 'effect';
import { render } from 'solid-js/web';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';

import { resolveMascotPoseUrl } from '@/common/infrastructure/resolve-mascot-pose-url';
import { applyBeatOverlayRootStyles } from '@/content/beat-overlay/apply-beat-overlay-root-styles';
import { MascotOverlayRoot } from '@/content/components/mascot-overlay/mascot-overlay-root';
import type { MascotVisibilityControls } from '@/mascot/visibility';

export interface BeatOverlayHandle {
	readonly remove: () => void;
}

export async function mountBeatOverlay(
	ctx: ContentScriptContext,
	runtime: Runtime.Runtime<never>,
	visibility: MascotVisibilityControls,
): Promise<BeatOverlayHandle> {
	const ui = await createShadowRootUi(ctx, {
		name: 'likes-to-go-beat',
		// Inline mode: WXT overlay positioning sets inline styles on shadow html.
		// Placement is owned by `.beat-overlay-root` in main.css instead.
		position: 'inline',
		anchor: 'body',
		isolateEvents: true,
		onMount: (uiContainer, shadow, shadowHost) => {
			applyBeatOverlayRootStyles(shadow);

			return render(
				() => (
					<MascotOverlayRoot
						runtime={runtime}
						visibility={visibility}
						shadowHost={shadowHost}
						resolvePoseUrl={resolveMascotPoseUrl}
						onHostVisibilityChange={(attrs) => {
							void Runtime.runPromise(runtime)(
								Effect.log('overlay host visibility', attrs),
							);
						}}
					/>
				),
				uiContainer,
			);
		},
		onRemove: (unmount) => {
			unmount?.();
		},
	});

	ui.mount();

	return { remove: () => ui.remove() };
}
