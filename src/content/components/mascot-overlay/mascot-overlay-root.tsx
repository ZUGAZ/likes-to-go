import { createEffect } from 'solid-js';
import type { Runtime } from 'effect';

import { BeatContainer } from '@/mascot/container';
import type { BeatPoseKey } from '@/mascot/persona';
import type { MascotVisibilityControls } from '@/mascot/visibility';

interface MascotOverlayRootProps {
	readonly runtime: Runtime.Runtime<never>;
	readonly visibility: MascotVisibilityControls;
	readonly shadowHost: HTMLElement;
	readonly resolvePoseUrl: (pose: BeatPoseKey) => string;
}

export function MascotOverlayRoot(props: MascotOverlayRootProps) {
	createEffect(() => {
		const visible = props.visibility.isVisible();
		props.shadowHost.setAttribute('aria-hidden', visible ? 'false' : 'true');
		props.shadowHost.style.pointerEvents = visible ? 'auto' : 'none';
	});

	return (
		<BeatContainer
			runtime={props.runtime}
			visibility={props.visibility}
			resolvePoseUrl={props.resolvePoseUrl}
		/>
	);
}
