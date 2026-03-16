import type { Component } from 'solid-js';

import { PopupContainer } from '@/popup/components/popup/container';
import { PopupRuntimeProvider } from '@/popup/runtime/runtime-context';
import type { PopupEnv } from '@/popup/runtime/popup-env';
import type { Runtime } from 'effect';

export const PopupRoot: Component<{ runtime: Runtime.Runtime<PopupEnv> }> = (
	props,
) => (
	<PopupRuntimeProvider runtime={props.runtime}>
		<PopupContainer />
	</PopupRuntimeProvider>
);

