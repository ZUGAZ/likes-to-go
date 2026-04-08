import type { CollectionCommand } from '@/common/model/collection/command';
import { CheckLogin } from '@/common/model/collection/commands/check-login';
import { CloseTab } from '@/common/model/collection/commands/close-tab';
import { CreateTab } from '@/common/model/collection/commands/create-tab';
import { DownloadExportCommand } from '@/common/model/collection/commands/download-export-command';
import { NotifyPopup } from '@/common/model/collection/commands/notify-popup';
import { SendCancelToTab } from '@/common/model/collection/commands/send-cancel-to-tab';
import { SendStartToTab } from '@/common/model/collection/commands/send-start-to-tab';
import type { CollectionEvent } from '@/common/model/collection/event';
import { isCancelCollectionEvent } from '@/common/model/collection/events/cancel-collection';
import { isCollectionCompleteEvent } from '@/common/model/collection/events/collection-complete';
import { isCollectionErrorEvent } from '@/common/model/collection/events/collection-error';
import { isDownloadExportEvent } from '@/common/model/collection/events/download-export-event';
import { isDownloadFailedEvent } from '@/common/model/collection/events/download-failed';
import { isGetStateRequested } from '@/common/model/collection/events/get-state-requested';
import { isLoginRequired } from '@/common/model/collection/events/login-required';
import { isLoginVerified } from '@/common/model/collection/events/login-verified';
import { isSendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';
import { isStartCollectionEvent } from '@/common/model/collection/events/start-collection';
import { isTabComplete } from '@/common/model/collection/events/tab-complete';
import { isTabCreateFailed } from '@/common/model/collection/events/tab-create-failed';
import { isTabCreated } from '@/common/model/collection/events/tab-created';
import { isTracksBatchEvent } from '@/common/model/collection/events/tracks-batch';
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
import type { Track } from '@/common/model/track';

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
		if (isGetStateRequested(event)) {
			return {
				state: current,
				commands: [CheckLogin()],
			};
		}
		if (isStartCollectionEvent(event)) {
			const newState = CollectingRequested();
			return {
				state: newState,
				commands: [CheckLogin(), NotifyPopup({ state: newState })],
			};
		}
		if (isDownloadFailedEvent(event)) {
			const newState = ErrorState({ message: event.message });
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		if (isLoginRequired(event)) {
			const newState = ErrorState({
				message: 'Please log in to SoundCloud, then try again.',
			});
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		if (isLoginVerified(event)) {
			return { state: current, commands: [] };
		}
		return { state: current, commands: [] };
	}

	if (isCollectingRequested(current)) {
		if (isTabCreated(event)) {
			const newState = Collecting({
				tabId: event.tabId,
				tracks: [],
				skippedTrackCount: 0,
			});
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		if (isTabCreateFailed(event)) {
			const newState = ErrorState({ message: event.message });
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		if (isLoginVerified(event)) {
			return {
				state: current,
				commands: [CreateTab({ url: LIKES_URL })],
			};
		}
		if (isLoginRequired(event)) {
			const newState = ErrorState({
				message: 'Please log in to SoundCloud, then try again.',
			});
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		if (isCancelCollectionEvent(event)) {
			const newState = Idle();
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		return { state: current, commands: [] };
	}

	if (isCollecting(current)) {
		if (isTracksBatchEvent(event)) {
			const newState = Collecting({
				tabId: current.tabId,
				tracks: appendTracksDeduped(current.tracks, event.tracks),
				skippedTrackCount: current.skippedTrackCount + event.skippedTrackCount,
			});
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		if (isCollectionCompleteEvent(event)) {
			const newState = Done({
				tracks: current.tracks,
				skippedTrackCount: current.skippedTrackCount,
			});
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		if (isCollectionErrorEvent(event)) {
			const newState = ErrorState({ message: event.message });
			return {
				state: newState,
				commands: [
					CloseTab({ tabId: current.tabId }),
					NotifyPopup({ state: newState }),
				],
			};
		}
		if (isCancelCollectionEvent(event)) {
			const newState = Idle();
			return {
				state: newState,
				commands: [
					SendCancelToTab({ tabId: current.tabId }),
					CloseTab({ tabId: current.tabId }),
					NotifyPopup({ state: newState }),
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
			const newState = ErrorState({ message: event.message });
			return {
				state: newState,
				commands: [
					CloseTab({ tabId: current.tabId }),
					NotifyPopup({ state: newState }),
				],
			};
		}
		if (isDownloadExportEvent(event)) {
			const newState = Idle();
			return {
				state: newState,
				commands: [
					DownloadExportCommand({ tracks: current.tracks }),
					NotifyPopup({ state: newState }),
				],
			};
		}
		return { state: current, commands: [] };
	}

	if (isDone(current)) {
		if (isDownloadExportEvent(event)) {
			const newState = Idle();
			return {
				state: newState,
				commands: [
					DownloadExportCommand({ tracks: current.tracks }),
					NotifyPopup({ state: newState }),
				],
			};
		}
		if (isCancelCollectionEvent(event)) {
			const newState = Idle();
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		return { state: current, commands: [] };
	}

	if (isErrorState(current)) {
		if (isGetStateRequested(event)) {
			return {
				state: current,
				commands: [CheckLogin()],
			};
		}
		if (isDownloadFailedEvent(event)) {
			const newState = ErrorState({ message: event.message });
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		if (isCancelCollectionEvent(event)) {
			const newState = Idle();
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		if (isStartCollectionEvent(event)) {
			const newState = CollectingRequested();
			return {
				state: newState,
				commands: [CheckLogin(), NotifyPopup({ state: newState })],
			};
		}
		return { state: current, commands: [] };
	}

	return { state: current, commands: [] };
}

export const initialCollectionState: CollectionState = Idle();
