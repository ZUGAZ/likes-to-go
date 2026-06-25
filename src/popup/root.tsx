import type { Component } from 'solid-js';

import { MascotPopup } from '@/popup/mascot-popup';
import { PopupRuntimeProvider } from '@/popup/runtime/runtime-context';
import type { PopupRuntime } from '@/popup/runtime/popup-runtime-type';

export const PopupRoot: Component<{ runtime: PopupRuntime }> = (props) => (
	<PopupRuntimeProvider runtime={props.runtime}>
		<MascotPopup />
	</PopupRuntimeProvider>
);
