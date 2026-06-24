import { CommandRunnerTag } from '@/background/command-runner';
import { CollectionStateStorageTag } from '@/background/infrastructure/collection-state-storage';
import { StateRefTag } from '@/background/state-ref';
import type { CollectionCommand } from '@/common/model/collection/command';
import type { CollectionEvent } from '@/common/model/collection/event';
import { requestMessageToCollectionEvent } from '@/common/model/collection/request-message-to-event';
import { hasTracks } from '@/common/model/collection/state';
import { collectionStateToGetStateResponse } from '@/common/model/collection/state-to-response';
import { isErrorState } from '@/common/model/collection/states/error-state';
import { transition } from '@/common/model/collection/transition';
import type {
	GetStateResponse,
	RequestMessage,
} from '@/common/model/request-message';
import { Effect, Ref } from 'effect';

export type BackgroundEnv =
	| StateRefTag
	| CommandRunnerTag
	| CollectionStateStorageTag;

function runCommandEffect(
	cmd: CollectionCommand,
): Effect.Effect<void, never, BackgroundEnv> {
	return Effect.gen(function* () {
		const runner = yield* CommandRunnerTag;
		yield* runner.run(cmd);
	});
}

export function dispatchEffect(
	event: CollectionEvent,
): Effect.Effect<void, never, BackgroundEnv> {
	return Effect.gen(function* () {
		const ref = yield* StateRefTag;
		const current = yield* Ref.get(ref);
		const result = transition(current, event);
		yield* Ref.set(ref, result.state);
		const storage = yield* CollectionStateStorageTag;
		yield* storage
			.sync(result.state)
			.pipe(
				Effect.catchAll((error) =>
					Effect.logWarning(
						'collection state storage sync failed',
						error.reason,
					),
				),
			);
		const stateTag = result.state._tag;
		const message = isErrorState(result.state)
			? result.state.message
			: 'No message';
		const tracksLen = hasTracks(result.state)
			? result.state.tracks.length
			: undefined;

		yield* Effect.log(
			'Event:',
			event._tag,
			'→ state',
			stateTag,
			message,
			tracksLen !== undefined ? { tracks: tracksLen } : '',
			'commands',
			result.commands.map((cmd) => cmd._tag).join(', '),
		);

		yield* Effect.forEach(result.commands, runCommandEffect);
	}).pipe(Effect.withLogSpan('Dispatch'));
}

export function handleMessageEffect(
	message: RequestMessage,
	sender: chrome.runtime.MessageSender,
): Effect.Effect<GetStateResponse, never, BackgroundEnv> {
	void sender;
	return Effect.gen(function* () {
		yield* Effect.log('incomming message', message._tag);

		const event = requestMessageToCollectionEvent(message);
		yield* dispatchEffect(event);

		const ref = yield* StateRefTag;
		const state = yield* Ref.get(ref);
		return collectionStateToGetStateResponse(state);
	}).pipe(Effect.withLogSpan('handleMessage'));
}
