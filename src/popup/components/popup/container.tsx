import { onCleanup, onMount } from 'solid-js';

import { bindViewModel } from '@/common/viewmodel/bind-viewmodel';
import { PopupView } from '@/popup/components/popup/view';
import { createPopupViewModel } from '@/popup/components/popup/view-model';
import { usePopupRuntime } from '@/popup/runtime/runtime-context';

export function PopupContainer() {
	const runtime = usePopupRuntime();
	const vm = bindViewModel(runtime, createPopupViewModel(), 'PopupViewModel');

	onMount(() => {
		vm.actions.syncState();
	});

	onCleanup(() => {
		vm.teardown();
	});

	return (
		<PopupView
			state={vm.state}
			trackCount={vm.trackCount}
			errorMessage={vm.errorMessage}
			skippedTrackCount={vm.skippedTrackCount}
			onStart={vm.actions.startCollection}
			onCancel={vm.actions.cancelCollection}
			onDownload={vm.actions.download}
		/>
	);
}
