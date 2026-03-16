import { isPopupStateUpdate } from '@/common/model/request-message/popup-state-update';
import type { CollectionStatus } from '@/common/model/request-message';

export interface StateUpdatePayload {
	readonly status: CollectionStatus;
	readonly trackCount: number;
	readonly errorMessage?: string | undefined;
}

export function listenForStateUpdates(
	onStateUpdate: (payload: StateUpdatePayload) => void,
): () => void {
	const listener = (message: unknown): void => {
		if (!isPopupStateUpdate(message)) {
			return;
		}

		onStateUpdate({
			status: message.status,
			trackCount: message.trackCount,
			errorMessage: message.errorMessage,
		});
	};

	chrome.runtime.onMessage.addListener(listener);

	return () => {
		chrome.runtime.onMessage.removeListener(listener);
	};
}
