import type { GetStateResponse } from '@/common/model/get-state-response';
import type { Track } from '@/common/model/track';
import type { CollectionCommand } from '@/common/model/collection-command';
import type { CollectionEvent } from '@/common/model/collection-event';
import type { CollectionState } from '@/common/model/collection-state';
import {
	Collecting,
	CollectingRequested,
	Done,
	ErrorState,
	Idle,
	hasTracks,
	isCollecting,
	isCollectingRequested,
	isDone,
	isErrorState,
	isIdle,
} from '@/common/model/collection-state';
import {
	CloseTab,
	CreateTab,
	DownloadExportCommand,
	SendStartToTab,
} from '@/common/model/collection-command';
import {
	isCancelCollectionEvent,
	isCollectionCompleteEvent,
	isCollectionErrorEvent,
	isDownloadExportEvent,
	isDownloadFailedEvent,
	isSendToTabFailed,
	isStartCollectionEvent,
	isTabComplete,
	isTabCreateFailed,
	isTabCreated,
	isTracksBatchEvent,
} from '@/common/model/collection-event';

const LIKES_URL = 'https://soundcloud.com/you/likes';

export interface TransitionResult {
	state: CollectionState;
	commands: readonly CollectionCommand[];
}

function appendTracksDeduped(
	current: readonly Track[],
	newTracks: readonly Track[],
): Track[] {
	const urlSet = new Set(current.map((t) => t.url.toString()));
	const out: Track[] = [...current];
	for (const t of newTracks) {
		const urlStr = t.url.toString();
		if (!urlSet.has(urlStr)) {
			urlSet.add(urlStr);
			out.push(t);
		}
	}
	return out;
}

export function transition(
	current: CollectionState,
	event: CollectionEvent,
): TransitionResult {
	if (isIdle(current)) {
		if (isStartCollectionEvent(event)) {
			return {
				state: CollectingRequested(),
				commands: [CreateTab({ url: LIKES_URL })],
			};
		}
		if (isDownloadFailedEvent(event)) {
			return {
				state: ErrorState({ message: event.message }),
				commands: [],
			};
		}
		return { state: current, commands: [] };
	}

	if (isCollectingRequested(current)) {
		if (isTabCreated(event)) {
			return {
				state: Collecting({ tabId: event.tabId, tracks: [] }),
				commands: [],
			};
		}
		if (isTabCreateFailed(event)) {
			return {
				state: ErrorState({ message: event.message }),
				commands: [],
			};
		}
		if (isCancelCollectionEvent(event)) {
			return { state: Idle(), commands: [] };
		}
		return { state: current, commands: [] };
	}

	if (isCollecting(current)) {
		if (isTracksBatchEvent(event)) {
			return {
				state: Collecting({
					tabId: current.tabId,
					tracks: appendTracksDeduped(current.tracks, event.tracks),
				}),
				commands: [],
			};
		}
		if (isCollectionCompleteEvent(event)) {
			return {
				state: Done({ tracks: current.tracks }),
				commands: [],
			};
		}
		if (isCollectionErrorEvent(event)) {
			return {
				state: ErrorState({ message: event.message }),
				commands: [CloseTab({ tabId: current.tabId })],
			};
		}
		if (isCancelCollectionEvent(event)) {
			return {
				state: Idle(),
				commands: [CloseTab({ tabId: current.tabId })],
			};
		}
		if (isTabComplete(event) && event.tabId === current.tabId) {
			return {
				state: current,
				commands: [SendStartToTab({ tabId: current.tabId })],
			};
		}
		if (isSendToTabFailed(event)) {
			return {
				state: ErrorState({ message: event.message }),
				commands: [CloseTab({ tabId: current.tabId })],
			};
		}
		if (isDownloadExportEvent(event)) {
			return {
				state: Idle(),
				commands: [DownloadExportCommand({ tracks: current.tracks })],
			};
		}
		return { state: current, commands: [] };
	}

	if (isDone(current)) {
		if (isDownloadExportEvent(event)) {
			return {
				state: Idle(),
				commands: [DownloadExportCommand({ tracks: current.tracks })],
			};
		}
		if (isCancelCollectionEvent(event)) {
			return { state: Idle(), commands: [] };
		}
		return { state: current, commands: [] };
	}

	if (isErrorState(current)) {
		if (isDownloadFailedEvent(event)) {
			return {
				state: ErrorState({ message: event.message }),
				commands: [],
			};
		}
		if (isCancelCollectionEvent(event)) {
			return { state: Idle(), commands: [] };
		}
		if (isStartCollectionEvent(event)) {
			return {
				state: CollectingRequested(),
				commands: [CreateTab({ url: LIKES_URL })],
			};
		}
		return { state: current, commands: [] };
	}

	return { state: current, commands: [] };
}

export function collectionStateToGetStateResponse(
	state: CollectionState,
): GetStateResponse {
	const status = isIdle(state)
		? 'idle'
		: isCollectingRequested(state) || isCollecting(state)
			? 'collecting'
			: isDone(state)
				? 'done'
				: 'error';
	const trackCount = hasTracks(state) ? state.tracks.length : 0;
	const errorMessage = isErrorState(state) ? state.message : undefined;
	return {
		status,
		trackCount,
		...(errorMessage !== undefined && { errorMessage }),
	};
}

export const initialCollectionState: CollectionState = Idle();
