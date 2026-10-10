import type { BackgroundEnv } from '@/background/runtime/background-env';
import { CollectionStateHydratedTag } from '@/background/state-ref';
import { Cause, Context, Deferred, Effect, Layer, Queue } from 'effect';

/**
 * Every entry from outside the state machine goes through the lane.
 * Jobs run one at a time, in submission order, on a runtime-owned fiber,
 * so a closed port never interrupts them. Nested `dispatchEffect` calls
 * from commands run inside the current job and must never `submit`.
 */
export interface DispatchLane {
	readonly submit: (
		job: Effect.Effect<void, never, BackgroundEnv>,
	) => Effect.Effect<void>;
	readonly submitAndAwait: <A, E>(
		job: Effect.Effect<A, E, BackgroundEnv>,
	) => Effect.Effect<A, E>;
	readonly drain: Effect.Effect<never, never, BackgroundEnv>;
}

export class DispatchLaneTag extends Context.Tag('DispatchLane')<
	DispatchLaneTag,
	DispatchLane
>() {}

export const DispatchLaneLive: Layer.Layer<DispatchLaneTag> = Layer.effect(
	DispatchLaneTag,
	Effect.gen(function* () {
		const queue =
			yield* Queue.unbounded<Effect.Effect<void, never, BackgroundEnv>>();

		const submit = (job: Effect.Effect<void, never, BackgroundEnv>) =>
			Queue.offer(queue, job).pipe(Effect.asVoid);

		const submitAndAwait = <A, E>(job: Effect.Effect<A, E, BackgroundEnv>) =>
			Effect.gen(function* () {
				const deferred = yield* Deferred.make<A, E>();
				yield* Queue.offer(
					queue,
					Effect.intoDeferred(job, deferred).pipe(Effect.asVoid),
				);
				return yield* Deferred.await(deferred);
			});

		const drain: DispatchLane['drain'] = Effect.flatMap(
			CollectionStateHydratedTag,
			(hydrated) => hydrated.await,
		).pipe(
			Effect.andThen(
				Effect.forever(
					Queue.take(queue).pipe(
						Effect.flatMap((job) =>
							job.pipe(
								Effect.catchAllCause((cause) =>
									Effect.logError('dispatch job failed', Cause.pretty(cause)),
								),
							),
						),
					),
				),
			),
			Effect.withLogSpan('DispatchLane'),
		);

		return { submit, submitAndAwait, drain };
	}),
);

export const DispatchLaneWorkerLive: Layer.Layer<never, never, BackgroundEnv> =
	Layer.scopedDiscard(
		Effect.flatMap(DispatchLaneTag, (lane) => Effect.forkScoped(lane.drain)),
	);
