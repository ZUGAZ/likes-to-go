import { createContext, untrack, useContext } from 'solid-js';
import type { ParentComponent } from 'solid-js';
import type { Runtime } from 'effect';

import type { PopupEnv } from '@/popup/runtime/popup-env';

const PopupRuntimeContext = createContext<
	Runtime.Runtime<PopupEnv> | undefined
>(undefined);

export const PopupRuntimeProvider: ParentComponent<{
	runtime: Runtime.Runtime<PopupEnv>;
}> = (props) => {
	const runtime = untrack(() => props.runtime);

	return (
		<PopupRuntimeContext.Provider value={runtime}>
			{props.children}
		</PopupRuntimeContext.Provider>
	);
};

export function usePopupRuntime(): Runtime.Runtime<PopupEnv> {
	const runtime = useContext(PopupRuntimeContext);
	if (runtime === undefined) {
		throw new Error('PopupRuntimeProvider is missing in the component tree');
	}
	return runtime;
}
