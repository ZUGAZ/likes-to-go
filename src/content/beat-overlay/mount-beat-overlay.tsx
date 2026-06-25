import { render } from 'solid-js/web';
import type { Runtime } from 'effect';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';

import { MascotOverlayRoot } from '@/content/components/mascot-overlay/mascot-overlay-root';
import { resolveContentMascotPoseUrl } from '@/content/infrastructure/resolve-mascot-pose-url';
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
		position: 'overlay',
		anchor: 'body',
		alignment: 'bottom-right',
		isolateEvents: true,
		zIndex: 2_147_483_646,
		onMount: (uiContainer, _shadow, shadowHost) => {
			shadowHost.classList.add('beat-overlay-host');

			return render(
				() => (
					<MascotOverlayRoot
						runtime={runtime}
						visibility={visibility}
						shadowHost={shadowHost}
						resolvePoseUrl={resolveContentMascotPoseUrl}
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
