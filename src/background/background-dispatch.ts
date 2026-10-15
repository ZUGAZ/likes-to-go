import { CommandRunnerTag } from '@/background/command-runner';
import { CollectionStateStorageTag } from '@/background/infrastructure/collection-state-storage';
import { maybeRevealOverlayEffect } from '@/background/overlay-handoff';
import type { BackgroundEnv } from '@/background/runtime/background-env';
import { StateRefTag } from '@/background/state-ref';
import type { CollectionCommand } from '@/common/model/collection/command';
import type { CollectionEvent } from '@/common/model/collection/event';
import { hasTracks } from '@/common/model/collection/state';
import { isErrorState } from '@/common/model/collection/states/error-state';
import { transition } from '@/common/model/collection/transition';
import { Effect, SubscriptionRef } from 'effect';

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
		const result = yield* SubscriptionRef.modify(ref, (current) => {
			const next = transition(current, event);
			return [next, next.state] as const;
		});
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
		yield* maybeRevealOverlayEffect();
	}).pipe(Effect.withLogSpan('Dispatch'));
}
