import type { ExportFormatId } from '@/common/model/export-format/export-format-id';
import type { ExportUnavailable } from '@/common/model/messaging/background-rpcs';
import type { CollectionView } from '@/common/model/messaging/collection-view';
import { Context, Data, type Effect, type Stream } from 'effect';

/** The collection fields a Beat surface renders. */
export type CollectionSnapshot = Pick<
	CollectionView,
	'status' | 'trackCount' | 'message' | 'skippedTrackCount' | 'source'
>;

/** The background port is gone for good. */
export class BackgroundUnreachable extends Data.TaggedError(
	'BackgroundUnreachable',
)<{
	readonly reason: string;
}> {}

/** A save that did not finish, reported back to the background. */
export interface DownloadFailure {
	readonly message: string;
	readonly reason: string;
}

/**
 * The background's collection API as seen by a Beat surface.
 * `collectionUpdates` delivers the current state first, then changes.
 * Commands say they were accepted. Their effect arrives on `collectionUpdates`.
 */
export interface CollectionBackend {
	readonly collectionUpdates: Stream.Stream<
		CollectionSnapshot,
		BackgroundUnreachable
	>;
	readonly refresh: Effect.Effect<void, BackgroundUnreachable>;
	readonly startCollection: Effect.Effect<void, BackgroundUnreachable>;
	readonly cancelCollection: Effect.Effect<void, BackgroundUnreachable>;
	readonly downloadExport: (
		format: ExportFormatId,
	) => Effect.Effect<string, ExportUnavailable | BackgroundUnreachable>;
	readonly downloadSucceeded: Effect.Effect<void, BackgroundUnreachable>;
	readonly downloadCancelled: Effect.Effect<void, BackgroundUnreachable>;
	readonly downloadFailed: (
		failure: DownloadFailure,
	) => Effect.Effect<void, BackgroundUnreachable>;
}

export class CollectionBackendTag extends Context.Tag('CollectionBackend')<
	CollectionBackendTag,
	CollectionBackend
>() {}
