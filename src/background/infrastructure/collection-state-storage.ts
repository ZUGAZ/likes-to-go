import type { CollectionState } from '@/common/model/collection/state';
import {
	Collecting,
	isCollecting,
} from '@/common/model/collection/states/collecting';
import { Paused, isPaused } from '@/common/model/collection/states/paused';
import { TrackSchema } from '@/common/model/track';
import { Context, Data, Effect, Layer, Schema } from 'effect';

const COLLECTION_STATE_KEY = 'ltgCollectionState';

const StoredCollectionStatusSchema = Schema.Literal('collecting', 'paused');

const StoredActiveCollectionStateSchema = Schema.Struct({
	status: StoredCollectionStatusSchema,
	source: Schema.String,
	sourceUrl: Schema.String,
	tabId: Schema.Number,
	tracks: Schema.Array(TrackSchema),
	skippedTrackCount: Schema.Number,
});

const CollectionStateStoragePayloadSchema = Schema.Struct({
	ltgCollectionState: Schema.optional(StoredActiveCollectionStateSchema),
});

type StoredActiveCollectionState = Schema.Schema.Type<
	typeof StoredActiveCollectionStateSchema
>;

export class PersistCollectionStateFailed extends Data.TaggedError(
	'PersistCollectionStateFailed',
)<{
	readonly reason: string;
}> {}

export class LoadCollectionStateFailed extends Data.TaggedError(
	'LoadCollectionStateFailed',
)<{
	readonly reason: string;
}> {}

export class ClearCollectionStateFailed extends Data.TaggedError(
	'ClearCollectionStateFailed',
)<{
	readonly reason: string;
}> {}

export type CollectionStateStorageError =
	| PersistCollectionStateFailed
	| LoadCollectionStateFailed
	| ClearCollectionStateFailed;

export interface CollectionStateStorage {
	readonly load: () => Effect.Effect<
		CollectionState | null,
		LoadCollectionStateFailed
	>;
	readonly sync: (
		state: CollectionState,
	) => Effect.Effect<void, CollectionStateStorageError>;
}

export class CollectionStateStorageTag extends Context.Tag(
	'CollectionStateStorage',
)<CollectionStateStorageTag, CollectionStateStorage>() {}

function errorReason(error: unknown): string {
	if (error instanceof Error) return error.message;
	return String(error);
}

function collectionStateToStoredActive(
	state: CollectionState,
): StoredActiveCollectionState | null {
	if (isCollecting(state)) {
		return {
			status: 'collecting',
			source: state.sourceUrl,
			sourceUrl: state.sourceUrl,
			tabId: state.tabId,
			tracks: state.tracks,
			skippedTrackCount: state.skippedTrackCount,
		};
	}

	if (isPaused(state)) {
		return {
			status: 'paused',
			source: state.sourceUrl,
			sourceUrl: state.sourceUrl,
			tabId: state.tabId,
			tracks: state.tracks,
			skippedTrackCount: state.skippedTrackCount,
		};
	}

	return null;
}

function storedActiveToCollectionState(
	stored: StoredActiveCollectionState,
): CollectionState {
	if (stored.status === 'collecting') {
		return Collecting({
			sourceUrl: stored.sourceUrl,
			tabId: stored.tabId,
			tracks: stored.tracks,
			skippedTrackCount: stored.skippedTrackCount,
		});
	}

	return Paused({
		sourceUrl: stored.sourceUrl,
		tabId: stored.tabId,
		tracks: stored.tracks,
		skippedTrackCount: stored.skippedTrackCount,
	});
}

export function persistCollectionStateEffect(
	state: CollectionState,
): Effect.Effect<void, PersistCollectionStateFailed> {
	const stored = collectionStateToStoredActive(state);

	if (stored === null) {
		return Effect.void;
	}

	return Effect.try({
		try: () => Schema.encodeSync(StoredActiveCollectionStateSchema)(stored),
		catch: (error) =>
			new PersistCollectionStateFailed({ reason: errorReason(error) }),
	}).pipe(
		Effect.flatMap((encoded) =>
			Effect.tryPromise({
				try: () =>
					chrome.storage.session.set({ [COLLECTION_STATE_KEY]: encoded }),
				catch: (error) =>
					new PersistCollectionStateFailed({ reason: errorReason(error) }),
			}),
		),
		Effect.asVoid,
	);
}

export function loadCollectionStateEffect(): Effect.Effect<
	CollectionState | null,
	LoadCollectionStateFailed
> {
	return Effect.tryPromise({
		try: () => chrome.storage.session.get(COLLECTION_STATE_KEY),
		catch: (error) =>
			new LoadCollectionStateFailed({ reason: errorReason(error) }),
	}).pipe(
		Effect.flatMap((raw) =>
			Effect.try({
				try: () =>
					Schema.decodeUnknownSync(CollectionStateStoragePayloadSchema)(raw),
				catch: (error) =>
					new LoadCollectionStateFailed({ reason: errorReason(error) }),
			}),
		),
		Effect.map((payload) => {
			const stored = payload.ltgCollectionState;
			if (stored === undefined) return null;
			return storedActiveToCollectionState(stored);
		}),
	);
}

export function clearCollectionStateEffect(): Effect.Effect<
	void,
	ClearCollectionStateFailed
> {
	return Effect.tryPromise({
		try: () => chrome.storage.session.remove(COLLECTION_STATE_KEY),
		catch: (error) =>
			new ClearCollectionStateFailed({ reason: errorReason(error) }),
	}).pipe(Effect.asVoid);
}

export function syncCollectionStateEffect(
	state: CollectionState,
): Effect.Effect<void, CollectionStateStorageError> {
	const stored = collectionStateToStoredActive(state);
	if (stored === null) return clearCollectionStateEffect();

	return persistCollectionStateEffect(state);
}

export const CollectionStateStorageLive: Layer.Layer<CollectionStateStorageTag> =
	Layer.succeed(CollectionStateStorageTag, {
		load: loadCollectionStateEffect,
		sync: syncCollectionStateEffect,
	});

export const CollectionStateStorageNoop: Layer.Layer<CollectionStateStorageTag> =
	Layer.succeed(CollectionStateStorageTag, {
		load: () => Effect.succeed(null),
		sync: () => Effect.void,
	});
