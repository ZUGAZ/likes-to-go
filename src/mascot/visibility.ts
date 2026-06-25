import { createSignal } from 'solid-js';

export interface MascotVisibilityControls {
	readonly isVisible: () => boolean;
	readonly summon: () => void;
	readonly dismiss: () => void;
	readonly toggle: () => void;
}

export function createMascotVisibility(
	initiallyVisible: boolean,
): MascotVisibilityControls {
	const [isVisible, setIsVisible] = createSignal(initiallyVisible);

	return {
		isVisible,
		summon: () => setIsVisible(true),
		dismiss: () => setIsVisible(false),
		toggle: () => setIsVisible((v) => !v),
	};
}
