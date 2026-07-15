import { createSignal } from 'solid-js';

export type MascotVisibilityTransition = 'summon' | 'dismiss' | 'toggle';

export interface MascotVisibilityOptions {
	readonly onTransition?: (
		action: MascotVisibilityTransition,
		visible: boolean,
	) => void;
}

export interface MascotVisibilityControls {
	readonly isVisible: () => boolean;
	readonly summon: () => void;
	readonly dismiss: () => void;
	readonly toggle: () => void;
}

export function createMascotVisibility(
	initiallyVisible: boolean,
	options?: MascotVisibilityOptions,
): MascotVisibilityControls {
	const [isVisible, setIsVisible] = createSignal(initiallyVisible);
	const onTransition = options?.onTransition;

	return {
		isVisible,
		summon: () => {
			setIsVisible(true);
			onTransition?.('summon', true);
		},
		dismiss: () => {
			setIsVisible(false);
			onTransition?.('dismiss', false);
		},
		toggle: () => {
			setIsVisible((v) => {
				const visible = !v;
				onTransition?.('toggle', visible);
				return visible;
			});
		},
	};
}
