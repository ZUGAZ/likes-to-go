import { createContext, untrack, useContext } from 'solid-js';
import type { ParentComponent } from 'solid-js';

import type { PopupRuntime } from '@/popup/runtime/popup-runtime-type';

const PopupRuntimeContext = createContext<PopupRuntime | undefined>(undefined);

export const PopupRuntimeProvider: ParentComponent<{
	runtime: PopupRuntime;
}> = (props) => {
	const runtime = untrack(() => props.runtime);

	return (
		<PopupRuntimeContext.Provider value={runtime}>
			{props.children}
		</PopupRuntimeContext.Provider>
	);
};

export function usePopupRuntime(): PopupRuntime {
	const runtime = useContext(PopupRuntimeContext);
	if (runtime === undefined) {
		throw new Error('PopupRuntimeProvider is missing in the component tree');
	}
	return runtime;
}
