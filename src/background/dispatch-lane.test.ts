import { describe, expect, it } from '@effect/vitest';
import {
	Cause,
	Data,
	Deferred,
	Effect,
	Equal,
	Exit,
	Fiber,
	Layer,
	Option,
	Ref,
} from 'effect';

import { DispatchLaneTag } from '@/background/dispatch-lane';
import { makeBackgroundTestLayer } from '@/test/background-test-layer';
import { makeCapturingLogger } from '@/test/effect-log-test';

class LaneFailure extends Data.TaggedError('LaneFailure')<{
	readonly detail: string;
}> {}

describe('dispatch lane', () => {
	it.scoped('runs 100 submits in submission order', () =>
		Effect.gen(function* () {
			const context = yield* Layer.build(makeBackgroundTestLayer());
			const order = yield* Ref.make<ReadonlyArray<number>>([]);
			const indices = Array.from({ length: 100 }, (_, index) => index);
			const lane = yield* DispatchLaneTag.pipe(Effect.provide(context));
			yield* Effect.forEach(indices, (index) =>
				lane.submit(Ref.update(order, (current) => [...current, index])),
			);
			expect(yield* lane.submitAndAwait(Ref.get(order))).toEqual(indices);
		}),
	);

	it.scoped('returns a value and a typed failure', () =>
		Effect.gen(function* () {
			const context = yield* Layer.build(makeBackgroundTestLayer());
			const lane = yield* DispatchLaneTag.pipe(Effect.provide(context));
			expect(yield* lane.submitAndAwait(Effect.succeed('ok'))).toBe('ok');
			const exit = yield* lane
				.submitAndAwait(Effect.fail(new LaneFailure({ detail: 'nope' })))
				.pipe(Effect.exit);
			expect(Exit.isFailure(exit)).toBe(true);
			if (Exit.isFailure(exit)) {
				const failure = Cause.failureOption(exit.cause);
				expect(
					Option.isSome(failure) &&
						Equal.equals(failure.value, new LaneFailure({ detail: 'nope' })),
				).toBe(true);
			}
		}),
	);

	it.scoped('logs a defect and keeps going', () =>
		Effect.gen(function* () {
			const logger = makeCapturingLogger();
			const context = yield* Layer.build(
				makeBackgroundTestLayer({ logger: logger.layer }),
			);
			const lane = yield* DispatchLaneTag.pipe(Effect.provide(context));
			yield* lane.submit(Effect.die('boom'));
			expect(yield* lane.submitAndAwait(Effect.succeed(1))).toBe(1);
			expect(
				logger
					.messages()
					.some((message) =>
						JSON.stringify(message).includes('dispatch job failed'),
					),
			).toBe(true);
		}),
	);

	it.scoped('waits for the hydration gate', () =>
		Effect.gen(function* () {
			const gate = yield* Deferred.make<boolean>();
			const ran = yield* Ref.make(false);
			const context = yield* Layer.build(
				makeBackgroundTestLayer({
					hydrationAwait: Deferred.await(gate).pipe(Effect.asVoid),
				}),
			);
			const lane = yield* DispatchLaneTag.pipe(Effect.provide(context));
			yield* lane.submit(Ref.set(ran, true));
			yield* Effect.yieldNow();
			expect(yield* Ref.get(ran)).toBe(false);
			yield* Deferred.succeed(gate, true);
			expect(yield* lane.submitAndAwait(Ref.get(ran))).toBe(true);
		}),
	);

	it.scoped('finishes a job after its caller is interrupted', () =>
		Effect.gen(function* () {
			const context = yield* Layer.build(makeBackgroundTestLayer());
			const started = yield* Deferred.make<boolean>();
			const release = yield* Deferred.make<boolean>();
			const finished = yield* Deferred.make<boolean>();
			const lane = yield* DispatchLaneTag.pipe(Effect.provide(context));
			const caller = yield* lane
				.submitAndAwait(
					Effect.gen(function* () {
						yield* Deferred.succeed(started, true);
						yield* Deferred.await(release);
						yield* Deferred.succeed(finished, true);
					}),
				)
				.pipe(Effect.fork);
			yield* Deferred.await(started);
			yield* Fiber.interrupt(caller);
			yield* Deferred.succeed(release, true);
			yield* Deferred.await(finished);
		}),
	);
});
