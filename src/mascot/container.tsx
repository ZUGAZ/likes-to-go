import type { Runtime } from 'effect';
import { onCleanup, onMount, untrack } from 'solid-js';

import { bindViewModel } from '@/common/viewmodel/bind-viewmodel';
import type { BeatPoseKey } from '@/mascot/persona';
import { BeatView } from '@/mascot/view';
import { createMascotViewModel } from '@/mascot/view-model';
import type { MascotVisibilityControls } from '@/mascot/visibility';

interface BeatContainerProps {
	readonly runtime: Runtime.Runtime<never>;
	readonly visibility: MascotVisibilityControls;
	readonly resolvePoseUrl: (pose: BeatPoseKey) => string;
	readonly onDismiss?: () => void;
}

export function BeatContainer(props: BeatContainerProps) {
	// Read stable construction-time values outside of Solid's reactive tracking.
	const runtime = untrack(() => props.runtime);
	const visibility = untrack(() => props.visibility);
	const resolvePoseUrl = untrack(() => props.resolvePoseUrl);
	const onDismiss = untrack(() => props.onDismiss) ?? visibility.dismiss;

	const vm = bindViewModel(
		runtime,
		createMascotViewModel({
			visibility,
			resolvePoseUrl,
		}),
		'MascotViewModel',
	);

	onMount(() => {
		vm.actions.syncState();
	});

	onCleanup(() => {
		vm.teardown();
	});

	return (
		<BeatView
			theme={vm.theme}
			state={vm.state}
			isVisible={vm.isVisible}
			poseUrl={vm.poseUrl}
			isStatusBusy={vm.isStatusBusy}
			balloonCopy={vm.balloonCopy}
			options={vm.options}
			footnoteCopy={vm.footnoteCopy}
			liveStatusMessage={vm.liveStatusMessage}
			onAction={vm.actions.handleAction}
			onDismiss={onDismiss}
		/>
	);
}
