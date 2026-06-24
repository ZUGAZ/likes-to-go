import type { Component } from 'solid-js';

import { PopupContainer } from '@/popup/components/popup/container';
import { PopupRuntimeProvider } from '@/popup/runtime/runtime-context';
import type { PopupRuntime } from '@/popup/runtime/popup-runtime-type';

export const PopupRoot: Component<{ runtime: PopupRuntime }> = (props) => (
	<PopupRuntimeProvider runtime={props.runtime}>
		<PopupContainer />
	</PopupRuntimeProvider>
);
