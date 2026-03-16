import { Effect } from 'effect';

import type { PopupStateUpdate } from '@/common/model/popup-state-update';

export function sendStateToPopup(
	message: PopupStateUpdate,
): Effect.Effect<void, never, never> {
	return Effect.tryPromise({
		try: () => chrome.runtime.sendMessage(message),
		catch: () => undefined,
	});
}
