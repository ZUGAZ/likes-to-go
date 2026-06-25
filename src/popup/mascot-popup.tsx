import { BeatContainer } from '@/mascot/container';
import { resolveBundledPoseUrl } from '@/mascot/pose-assets';
import { createMascotVisibility } from '@/mascot/visibility';
import { usePopupRuntime } from '@/popup/runtime/runtime-context';

export function MascotPopup() {
	const runtime = usePopupRuntime();

	return (
		<BeatContainer
			runtime={runtime}
			visibility={createMascotVisibility(true)}
			resolvePoseUrl={resolveBundledPoseUrl}
			onDismiss={window.close}
		/>
	);
}
