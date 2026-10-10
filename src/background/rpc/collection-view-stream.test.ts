import { describe, expect, it } from '@effect/vitest';
import { Caller, Content, Popup } from 'browser-extension-kit/messaging';
import {
	Deferred,
	Effect,
	Fiber,
	Option,
	Queue,
	Stream,
	SubscriptionRef,
} from 'effect';

import { watchCollectionView } from '@/background/rpc/collection-view-stream';
import {
	CollectionStateHydratedTag,
	StateRefTag,
} from '@/background/state-ref';
import { initialCollectionState } from '@/common/model/collection/transition';
import { Collecting } from '@/common/model/collection/states/collecting';
import { CollectingRequested } from '@/common/model/collection/states/collecting-requested';
import { Done } from '@/common/model/collection/states/done';
import type { CollectionState } from '@/common/model/collection/state';
import type { Endpoint } from 'browser-extension-kit/messaging';
import type { CollectionView } from '@/common/model/messaging/collection-view';

const track = (name: string) => ({
	title: name,
	artist: 'Artist',
	url: new URL(`https://soundcloud.com/artist/${name}`),
});

const collecting = (titles: readonly string[]): CollectionState =>
	Collecting({
		sourceUrl: 'https://soundcloud.com/you/likes',
		tabId: 7,
		tracks: titles.map(track),
		skippedTrackCount: 0,
	});

const watched = (
	ref: SubscriptionRef.SubscriptionRef<CollectionState>,
	caller: Endpoint,
	gate: Deferred.Deferred<boolean>,
) =>
	watchCollectionView.pipe(
		Stream.provideService(StateRefTag, ref),
		Stream.provideService(CollectionStateHydratedTag, {
			await: Deferred.await(gate),
		}),
		Stream.provideService(Caller, caller),
	);

describe('watchCollectionView', () => {
	it.scoped('emits the current view only after hydration', () =>
		Effect.gen(function* () {
			const ref = yield* SubscriptionRef.make(collecting(['one']));
			const gate = yield* Deferred.make<boolean>();
			const closed = yield* watched(ref, new Popup(), gate).pipe(
				Stream.take(1),
				Stream.runHead,
				Effect.fork,
			);
			yield* Effect.yieldNow();
			expect(Option.isNone(yield* Fiber.poll(closed))).toBe(true);
			yield* Deferred.succeed(gate, true);
			const first = yield* Fiber.join(closed);
			expect(Option.isSome(first) && first.value.trackCount).toBe(1);
			expect(Option.isSome(first) && first.value.status).toBe('collecting');
		}),
	);

	it.scoped('sends every distinct view to every subscriber', () =>
		Effect.gen(function* () {
			const ref = yield* SubscriptionRef.make(initialCollectionState);
			const gate = yield* Deferred.make<boolean>();
			yield* Deferred.succeed(gate, true);
			const callers = [
				new Content({ tabId: 7, frameId: 0 }),
				new Content({ tabId: 8, frameId: 0 }),
				new Popup(),
			];
			const queues = yield* Effect.forEach(callers, (caller) =>
				Effect.gen(function* () {
					const queue = yield* Queue.unbounded<CollectionView>();
					yield* watched(ref, caller, gate).pipe(
						Stream.runForEach((view) => Queue.offer(queue, view)),
						Effect.forkScoped,
					);
					return queue;
				}),
			);
			for (const queue of queues) {
				const first = yield* Queue.take(queue);
				expect(first.status).toBe('idle');
			}
			const next: ReadonlyArray<{
				readonly state: CollectionState;
				readonly status: string;
			}> = [
				{ state: CollectingRequested(), status: 'checking-login' },
				{ state: collecting(['one']), status: 'collecting' },
				{
					state: Done({ tracks: [track('one')], skippedTrackCount: 0 }),
					status: 'done',
				},
			];
			for (const step of next) {
				yield* SubscriptionRef.set(ref, step.state);
				for (const queue of queues) {
					expect((yield* Queue.take(queue)).status).toBe(step.status);
				}
			}
		}),
	);

	it.scoped('does not emit when the projected view is unchanged', () =>
		Effect.gen(function* () {
			const ref = yield* SubscriptionRef.make(collecting(['one']));
			const gate = yield* Deferred.make<boolean>();
			yield* Deferred.succeed(gate, true);
			const queue = yield* Queue.unbounded<CollectionView>();
			yield* watched(ref, new Popup(), gate).pipe(
				Stream.runForEach((view) => Queue.offer(queue, view)),
				Effect.forkScoped,
			);
			expect((yield* Queue.take(queue)).trackCount).toBe(1);
			yield* SubscriptionRef.set(ref, collecting(['other']));
			const pending = yield* Queue.take(queue).pipe(Effect.fork);
			yield* Effect.yieldNow();
			expect(Option.isNone(yield* Fiber.poll(pending))).toBe(true);
			yield* Fiber.interrupt(pending);
			yield* SubscriptionRef.set(ref, collecting(['one', 'two']));
			expect((yield* Queue.take(queue)).trackCount).toBe(2);
		}),
	);
});
