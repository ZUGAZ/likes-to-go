import { Effect, Runtime } from 'effect';

import {
	createMascotVisibility,
	type MascotVisibilityControls,
	type MascotVisibilityTransition,
} from '@/mascot/visibility';

export function logMascotVisibilityTransitionEffect(
	action: MascotVisibilityTransition,
	visible: boolean,
): Effect.Effect<void> {
	return Effect.log('overlay visibility', { action, visible });
}

export function createLoggedMascotVisibility(
	runtime: Runtime.Runtime<never>,
	initiallyVisible: boolean,
): MascotVisibilityControls {
	const run = Runtime.runPromise(runtime);

	return createMascotVisibility(initiallyVisible, {
		onTransition: (action: MascotVisibilityTransition, visible: boolean) => {
			void run(logMascotVisibilityTransitionEffect(action, visible));
		},
	});
}
