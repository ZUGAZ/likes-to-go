import { createEffect } from 'solid-js';
import type { Runtime } from 'effect';

import { BeatContainer } from '@/mascot/container';
import type { BeatPoseKey } from '@/mascot/persona';
import type { MascotVisibilityControls } from '@/mascot/visibility';

export interface MascotOverlayHostVisibility {
	readonly visible: boolean;
	readonly ariaHidden: string;
	readonly pointerEvents: string;
}

interface MascotOverlayRootProps {
	readonly runtime: Runtime.Runtime<never>;
	readonly visibility: MascotVisibilityControls;
	readonly shadowHost: HTMLElement;
	readonly resolvePoseUrl: (pose: BeatPoseKey) => string;
	readonly onHostVisibilityChange?: (
		attrs: MascotOverlayHostVisibility,
	) => void;
}

export function MascotOverlayRoot(props: MascotOverlayRootProps) {
	createEffect(() => {
		const visible = props.visibility.isVisible();
		const ariaHidden = visible ? 'false' : 'true';
		const pointerEvents = visible ? 'auto' : 'none';
		props.shadowHost.setAttribute('aria-hidden', ariaHidden);
		props.shadowHost.style.pointerEvents = pointerEvents;
		props.onHostVisibilityChange?.({ visible, ariaHidden, pointerEvents });
	});

	return (
		<BeatContainer
			runtime={props.runtime}
			visibility={props.visibility}
			resolvePoseUrl={props.resolvePoseUrl}
			presentation="overlay"
		/>
	);
}
