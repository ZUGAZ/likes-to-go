import { isPopupStateUpdate } from '@/common/model/request-message/popup-state-update';
import type { CollectionStatus, Source } from '@/common/model/request-message';

export interface StateUpdatePayload {
	readonly status: CollectionStatus;
	readonly trackCount: number;
	readonly message?: string | undefined;
	readonly skippedTrackCount?: number | undefined;
	readonly source?: Source | undefined;
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
			message: message.message,
			skippedTrackCount: message.skippedTrackCount,
			source: message.source,
		});
	};

	chrome.runtime.onMessage.addListener(listener);

	return () => {
		chrome.runtime.onMessage.removeListener(listener);
	};
}
