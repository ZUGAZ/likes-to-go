import type { CollectionEvent } from '@/common/model/collection/event';
import { CancelCollection } from '@/common/model/collection/events/cancel-collection';
import { CollectionComplete } from '@/common/model/collection/events/collection-complete';
import { CollectionError } from '@/common/model/collection/events/collection-error';
import { CollectionVisibilityPaused } from '@/common/model/collection/events/collection-visibility-paused';
import { CollectionVisibilityResumed } from '@/common/model/collection/events/collection-visibility-resumed';
import { DownloadCancelled } from '@/common/model/collection/events/download-cancelled';
import { DownloadExport } from '@/common/model/collection/events/download-export-event';
import { DownloadFailed } from '@/common/model/collection/events/download-failed';
import { DownloadSucceeded } from '@/common/model/collection/events/download-succeeded';
import { GetStateRequested } from '@/common/model/collection/events/get-state-requested';
import { LoginRequired } from '@/common/model/collection/events/login-required';
import { StartCollection } from '@/common/model/collection/events/start-collection';
import { TracksBatch } from '@/common/model/collection/events/tracks-batch';
import {
	type BackgroundRequestMessage,
	isCancelCollection,
	isCollectionComplete,
	isCollectionError,
	isCollectionVisibilityPaused,
	isCollectionVisibilityResumed,
	isDownloadCancelled,
	isDownloadExport,
	isDownloadFailedRequest,
	isDownloadSucceeded,
	isGetStateRequest,
	isLoginRequired,
	isStartCollection,
	isTracksBatch,
} from '@/common/model/request-message';
import { absurd } from 'effect/Function';

/**
 * Maps a validated RequestMessage to the corresponding CollectionEvent.
 * Used by the background to turn incoming messages into state-machine events without branching on _tag.
 */
export function requestMessageToCollectionEvent(
	message: BackgroundRequestMessage,
): CollectionEvent {
	if (isGetStateRequest(message)) return GetStateRequested();
	if (isStartCollection(message)) return StartCollection();
	if (isTracksBatch(message))
		return TracksBatch({
			tracks: message.tracks,
			skippedTrackCount: message.skippedTrackCount,
		});
	if (isCollectionComplete(message)) return CollectionComplete();
	if (isCollectionVisibilityPaused(message))
		return CollectionVisibilityPaused();
	if (isCollectionVisibilityResumed(message))
		return CollectionVisibilityResumed();
	if (isCollectionError(message))
		return CollectionError({
			message: message.message,
			reason: message.reason,
		});
	if (isLoginRequired(message))
		return LoginRequired({
			message: message.message,
			reason: message.reason,
		});
	if (isCancelCollection(message)) return CancelCollection();
	if (isDownloadExport(message)) return DownloadExport();
	if (isDownloadSucceeded(message)) return DownloadSucceeded();
	if (isDownloadCancelled(message)) return DownloadCancelled();
	if (isDownloadFailedRequest(message))
		return DownloadFailed({
			message: message.message,
			reason: message.reason,
		});
	return absurd(message);
}
