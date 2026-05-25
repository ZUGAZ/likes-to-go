import {
	PopupStateUpdateSchema,
	type PopupStateUpdate,
} from '@/common/model/request-message/popup-state-update';
import type { CollectionStatus, Source } from '@/common/model/request-message';
import { Data, Effect, Schema } from 'effect';

export class DecodeStateUpdateFailed extends Data.TaggedError(
	'DecodeStateUpdateFailed',
)<{
	readonly reason: string;
}> {}

export interface StateUpdatePayload {
	readonly status: CollectionStatus;
	readonly trackCount: number;
	readonly message?: string | undefined;
	readonly skippedTrackCount?: number | undefined;
	readonly source?: Source | undefined;
}

function popupStateUpdateToPayload(
	update: PopupStateUpdate,
): StateUpdatePayload {
	return {
		status: update.status,
		trackCount: update.trackCount,
		message: update.message,
		skippedTrackCount: update.skippedTrackCount,
		source: update.source,
	};
}

/**
 * Decode unknown popup state update messages at the Chrome listener boundary.
 */
export function decodeStateUpdatePayload(
	raw: unknown,
): Effect.Effect<StateUpdatePayload, DecodeStateUpdateFailed> {
	return Schema.decodeUnknown(PopupStateUpdateSchema)(raw).pipe(
		Effect.map(popupStateUpdateToPayload),
		Effect.mapError(
			(parseError) =>
				new DecodeStateUpdateFailed({
					reason: parseError.toString(),
				}),
		),
	);
}

/**
 * Register a Chrome runtime listener for validated popup state updates.
 * Returns an Effect that yields the unsubscribe function when run.
 */
export function listenForStateUpdatesEffect(
	onStateUpdate: (payload: StateUpdatePayload) => void,
): Effect.Effect<() => void> {
	return Effect.sync(() => {
		const listener = (message: unknown): void => {
			Effect.runSync(
				decodeStateUpdatePayload(message).pipe(
					Effect.tap((payload) => Effect.sync(() => onStateUpdate(payload))),
					Effect.catchAll(() => Effect.void),
				),
			);
		};

		chrome.runtime.onMessage.addListener(listener);

		return () => {
			chrome.runtime.onMessage.removeListener(listener);
		};
	});
}

export function listenForStateUpdates(
	onStateUpdate: (payload: StateUpdatePayload) => void,
): () => void {
	return Effect.runSync(listenForStateUpdatesEffect(onStateUpdate));
}
