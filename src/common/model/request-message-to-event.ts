import type { RequestMessage } from '@/common/model/request-message';
import {
	isCancelCollection,
	isCollectionComplete,
	isCollectionError,
	isDownloadExport,
	isGetStateRequest,
	isStartCollection,
	isTracksBatch,
} from '@/common/model/request-message';
import {
	CancelCollection,
	CollectionComplete,
	CollectionError,
	DownloadExport,
	type CollectionEvent,
	StartCollection,
	TracksBatch,
} from '@/common/model/collection-event';

/**
 * Maps a validated RequestMessage to the corresponding CollectionEvent, or null for GetState.
 * Used by the background to turn incoming messages into state-machine events without branching on _tag.
 */
export function requestMessageToCollectionEvent(
	message: RequestMessage,
): CollectionEvent | null {
	if (isGetStateRequest(message)) return null;
	if (isStartCollection(message)) return StartCollection();
	if (isTracksBatch(message)) return TracksBatch({ tracks: message.tracks });
	if (isCollectionComplete(message)) return CollectionComplete();
	if (isCollectionError(message))
		return CollectionError({ message: message.message });
	if (isCancelCollection(message)) return CancelCollection();
	if (isDownloadExport(message)) return DownloadExport();
	return null;
}
