import { CommandRunnerTag } from '@/background/command-runner';
import { StateRefTag } from '@/background/state-ref';
import type {
	CollectionCommand,
	CollectionEvent,
} from '@/common/model/collection';
import {
	collectionStateToGetStateResponse,
	getCollectionEventTag,
	hasTracks,
	requestMessageToCollectionEvent,
	transition,
} from '@/common/model/collection';
import type {
	GetStateResponse,
	RequestMessage,
} from '@/common/model/request-message';
import {
	isGetStateRequest,
	isTracksBatch,
} from '@/common/model/request-message';
import { Effect, Ref } from 'effect';

export type BackgroundEnv = StateRefTag | CommandRunnerTag;

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
		const stateTag = result.state._tag;
		const tracksLen = hasTracks(result.state)
			? result.state.tracks.length
			: undefined;
		console.log(
			'[likes-to-go] background dispatch',
			getCollectionEventTag(event),
			'→ state',
			stateTag,
			tracksLen !== undefined ? { tracks: tracksLen } : '',
		);
		yield* Effect.forEach(result.commands, runCommandEffect);
	});
}

export function handleMessageEffect(
	message: RequestMessage,
	sender: chrome.runtime.MessageSender,
): Effect.Effect<GetStateResponse, never, BackgroundEnv> {
	void sender;
	const logEffect = Effect.sync(() => {
		const batchInfo = isTracksBatch(message)
			? { tracks: message.tracks.length }
			: undefined;

		console.log('[likes-to-go] background received', message._tag, batchInfo);
	});

	const dispatchFromMessageEffect = Effect.sync(() =>
		requestMessageToCollectionEvent(message),
	).pipe(
		Effect.flatMap((event) =>
			event === null ? Effect.void : dispatchEffect(event),
		),
	);

	return StateRefTag.pipe(
		Effect.tap(() =>
			isGetStateRequest(message)
				? Effect.void
				: logEffect.pipe(Effect.zipRight(dispatchFromMessageEffect)),
		),
		Effect.flatMap((ref) =>
			Ref.get(ref).pipe(Effect.map(collectionStateToGetStateResponse)),
		),
	);
}
