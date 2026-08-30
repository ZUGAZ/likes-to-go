import { resolveMascotPoseUrl } from '@/common/infrastructure/resolve-mascot-pose-url';
import { BeatContainer } from '@/mascot/container';
import { createMascotVisibility } from '@/mascot/visibility';
import { createPopupDismissHandler } from '@/popup/dismiss-handler';
import { usePopupRuntime } from '@/popup/runtime/runtime-context';

export function MascotPopup() {
	const runtime = usePopupRuntime();

	return (
		<BeatContainer
			runtime={runtime}
			visibility={createMascotVisibility(true)}
			resolvePoseUrl={resolveMascotPoseUrl}
			onDismiss={createPopupDismissHandler(runtime)}
		/>
	);
}
