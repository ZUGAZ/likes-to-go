import type { CollectionCommand } from '@/common/model/collection/command';
import { CheckLogin } from '@/common/model/collection/commands/check-login';
import { CheckSource } from '@/common/model/collection/commands/check-source';
import { CloseTab } from '@/common/model/collection/commands/close-tab';
import { DownloadExportCommand } from '@/common/model/collection/commands/download-export-command';
import { NotifyPopup } from '@/common/model/collection/commands/notify-popup';
import { SelectCollectionTab } from '@/common/model/collection/commands/select-collection-tab';
import { SendCancelToTab } from '@/common/model/collection/commands/send-cancel-to-tab';
import { SendStartToTab } from '@/common/model/collection/commands/send-start-to-tab';
import type { CollectionEvent } from '@/common/model/collection/event';
import { isCancelCollectionEvent } from '@/common/model/collection/events/cancel-collection';
import { isCollectionCompleteEvent } from '@/common/model/collection/events/collection-complete';
import { isCollectionErrorEvent } from '@/common/model/collection/events/collection-error';
import { isCollectionVisibilityPausedEvent } from '@/common/model/collection/events/collection-visibility-paused';
import { isCollectionVisibilityResumedEvent } from '@/common/model/collection/events/collection-visibility-resumed';
import { isCollectionTabSelected } from '@/common/model/collection/events/collection-tab-selected';
import { isDownloadExportEvent } from '@/common/model/collection/events/download-export-event';
import { isDownloadFailedEvent } from '@/common/model/collection/events/download-failed';
import { isGetStateRequested } from '@/common/model/collection/events/get-state-requested';
import { isLoginRequired } from '@/common/model/collection/events/login-required';
import { isLoginVerified } from '@/common/model/collection/events/login-verified';
import { isSendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';
import { isSourceSelected } from '@/common/model/collection/events/source-selected';
import { isStartCollectionEvent } from '@/common/model/collection/events/start-collection';
import { isTabCreateFailed } from '@/common/model/collection/events/tab-create-failed';
import { isTabCreated } from '@/common/model/collection/events/tab-created';
import { isTracksBatchEvent } from '@/common/model/collection/events/tracks-batch';
import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
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
import { Paused, isPaused } from '@/common/model/collection/states/paused';
import type { Track } from '@/common/model/track';

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
				commands: [CheckSource(), CheckLogin()],
			};
		}
		if (isSourceSelected(event)) {
			return {
				state: Idle({ source: event.source }),
				commands: [],
			};
		}
		if (isStartCollectionEvent(event)) {
			const newState = CollectingRequested();
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState }), CheckLogin()],
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
				message: LOGIN_REQUIRED_MESSAGE,
				...(current.source === undefined ? {} : { source: current.source }),
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
		if (isCollectionTabSelected(event)) {
			const newState = Collecting({
				tabId: event.tabId,
				tracks: [],
				skippedTrackCount: 0,
			});
			return {
				state: newState,
				commands: [
					NotifyPopup({ state: newState }),
					SendStartToTab({ tabId: event.tabId }),
				],
			};
		}
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
				commands: [SelectCollectionTab()],
			};
		}
		if (isLoginRequired(event)) {
			const newState = ErrorState({
				message: LOGIN_REQUIRED_MESSAGE,
			});
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		if (isCancelCollectionEvent(event)) {
			const newState = Idle({});
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
		if (isCollectionVisibilityPausedEvent(event)) {
			const newState = Paused({
				tabId: current.tabId,
				tracks: current.tracks,
				skippedTrackCount: current.skippedTrackCount,
			});
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		if (isCollectionVisibilityResumedEvent(event)) {
			return { state: current, commands: [] };
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
		if (isLoginRequired(event)) {
			const newState = ErrorState({ message: LOGIN_REQUIRED_MESSAGE });
			return {
				state: newState,
				commands: [
					CloseTab({ tabId: current.tabId }),
					NotifyPopup({ state: newState }),
				],
			};
		}
		if (isCancelCollectionEvent(event)) {
			const newState = Idle({});
			return {
				state: newState,
				commands: [
					SendCancelToTab({ tabId: current.tabId }),
					CloseTab({ tabId: current.tabId }),
					NotifyPopup({ state: newState }),
				],
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
			const newState = Idle({});
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

	if (isPaused(current)) {
		if (isTracksBatchEvent(event)) {
			const newState = Paused({
				tabId: current.tabId,
				tracks: appendTracksDeduped(current.tracks, event.tracks),
				skippedTrackCount: current.skippedTrackCount + event.skippedTrackCount,
			});
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		if (isCollectionVisibilityResumedEvent(event)) {
			const newState = Collecting({
				tabId: current.tabId,
				tracks: current.tracks,
				skippedTrackCount: current.skippedTrackCount,
			});
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		if (isCollectionVisibilityPausedEvent(event)) {
			return { state: current, commands: [] };
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
		if (isLoginRequired(event)) {
			const newState = ErrorState({ message: LOGIN_REQUIRED_MESSAGE });
			return {
				state: newState,
				commands: [
					CloseTab({ tabId: current.tabId }),
					NotifyPopup({ state: newState }),
				],
			};
		}
		if (isCancelCollectionEvent(event)) {
			const newState = Idle({});
			return {
				state: newState,
				commands: [
					SendCancelToTab({ tabId: current.tabId }),
					CloseTab({ tabId: current.tabId }),
					NotifyPopup({ state: newState }),
				],
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
			const newState = Idle({});
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
			const newState = Idle({});
			return {
				state: newState,
				commands: [
					DownloadExportCommand({ tracks: current.tracks }),
					NotifyPopup({ state: newState }),
				],
			};
		}
		if (isCancelCollectionEvent(event)) {
			const newState = Idle({});
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
				commands: [CheckSource(), CheckLogin()],
			};
		}
		if (isSourceSelected(event)) {
			return {
				state: ErrorState({
					message: current.message,
					source: event.source,
				}),
				commands: [],
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
			const newState = Idle({});
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		if (isStartCollectionEvent(event)) {
			const newState = CollectingRequested();
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState }), CheckLogin()],
			};
		}
		if (isLoginVerified(event)) {
			const newState = Idle({
				source: current.source,
			});
			return {
				state: newState,
				commands: [NotifyPopup({ state: newState })],
			};
		}
		return { state: current, commands: [] };
	}

	return { state: current, commands: [] };
}

export const initialCollectionState: CollectionState = Idle({});
