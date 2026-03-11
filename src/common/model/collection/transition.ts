import type { Track } from '@/common/model/track';
import type { CollectionCommand } from '@/common/model/collection/command';
import type { CollectionEvent } from '@/common/model/collection/event';
import type { CollectionState } from '@/common/model/collection/state';
import {
	Collecting,
	isCollecting,
} from '@/common/model/collection/states/collecting';
import {
	CollectingRequested,
	isCollectingRequested,
} from '@/common/model/collection/states/collecting-requested';
import { Done, isDone } from '@/common/model/collection/states/done';
import {
	ErrorState,
	isErrorState,
} from '@/common/model/collection/states/error-state';
import { Idle, isIdle } from '@/common/model/collection/states/idle';
import { CloseTab } from '@/common/model/collection/commands/close-tab';
import { CreateTab } from '@/common/model/collection/commands/create-tab';
import { DownloadExportCommand } from '@/common/model/collection/commands/download-export-command';
import { SendCancelToTab } from '@/common/model/collection/commands/send-cancel-to-tab';
import { SendStartToTab } from '@/common/model/collection/commands/send-start-to-tab';
import { isCancelCollectionEvent } from '@/common/model/collection/events/cancel-collection';
import { isCollectionCompleteEvent } from '@/common/model/collection/events/collection-complete';
import { isCollectionErrorEvent } from '@/common/model/collection/events/collection-error';
import { isDownloadExportEvent } from '@/common/model/collection/events/download-export-event';
import { isDownloadFailedEvent } from '@/common/model/collection/events/download-failed';
import { isSendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';
import { isStartCollectionEvent } from '@/common/model/collection/events/start-collection';
import { isTabComplete } from '@/common/model/collection/events/tab-complete';
import { isTabCreateFailed } from '@/common/model/collection/events/tab-create-failed';
import { isTabCreated } from '@/common/model/collection/events/tab-created';
import { isTracksBatchEvent } from '@/common/model/collection/events/tracks-batch';

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
				commands: [
					SendCancelToTab({ tabId: current.tabId }),
					CloseTab({ tabId: current.tabId }),
				],
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

export const initialCollectionState: CollectionState = Idle();
