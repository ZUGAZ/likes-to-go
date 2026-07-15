import { BeatContainer } from '@/mascot/container';
import { resolveBundledPoseUrl } from '@/mascot/pose-assets';
import { createMascotVisibility } from '@/mascot/visibility';
import { createPopupDismissHandler } from '@/popup/dismiss-handler';
import { usePopupRuntime } from '@/popup/runtime/runtime-context';

export function MascotPopup() {
	const runtime = usePopupRuntime();

	return (
		<BeatContainer
			runtime={runtime}
			visibility={createMascotVisibility(true)}
			resolvePoseUrl={resolveBundledPoseUrl}
			onDismiss={createPopupDismissHandler(runtime)}
		/>
	);
}
