import { describe, expect, vi } from 'vitest';
import { it as effectIt } from '@effect/vitest';
import { Effect, Layer, Queue, Stream } from 'effect';

import { SendToBackgroundFailed } from '@/common/infrastructure/send-to-background';
import { backgroundUnreachableMessage } from '@/common/model/background-unreachable-message';
import {
	CollectionBackendTag,
	type CollectionSnapshot,
} from '@/mascot/collection-backend';
import { CollectionBackendLegacy } from '@/mascot/infrastructure/collection-backend-legacy';
import { makeCapturingLogger, silentLoggerLayer } from '@/test/effect-log-test';

const unsubscribe = vi.hoisted(() => vi.fn());

const listenerBox = vi.hoisted(() => {
	const box: {
		current: ((payload: unknown) => void) | undefined;
	} = { current: undefined };
	return box;
});

const state: {
	body: unknown;
	failure: string | undefined;
} = {
	body: undefined,
	failure: undefined,
};

const { sendToBackgroundMock } = vi.hoisted(() => ({
	sendToBackgroundMock: vi.fn(() =>
		Effect.suspend(() =>
			state.failure === undefined
				? Effect.succeed(state.body)
				: Effect.fail(new SendToBackgroundFailed({ reason: state.failure })),
		),
	),
}));

vi.mock(
	'@/common/infrastructure/send-to-background',
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import('@/common/infrastructure/send-to-background')
			>();
		return {
			...actual,
			sendToBackgroundEffect: sendToBackgroundMock,
		};
	},
);

vi.mock('@/common/infrastructure/listen-for-state-updates', () => ({
	listenForStateUpdatesEffect: (callback: (payload: unknown) => void) =>
		Effect.sync(() => {
			listenerBox.current = callback;
			return unsubscribe;
		}),
}));

const respond = (body: unknown) => {
	state.failure = undefined;
	state.body = body;
};

const failSend = (reason: string) => {
	state.failure = reason;
};

const nextSnapshot = (received: Queue.Queue<CollectionSnapshot>) =>
	Queue.take(received);

describe('CollectionBackendLegacy', () => {
	effectIt.scoped('publishes the replies the overlay used to apply', () =>
		Effect.gen(function* () {
			unsubscribe.mockClear();
			const logs = makeCapturingLogger();
			const backend = yield* CollectionBackendTag.pipe(
				Effect.provide(
					CollectionBackendLegacy.pipe(Layer.provideMerge(logs.layer)),
				),
			);
			const received = yield* Queue.unbounded<CollectionSnapshot>();
			yield* backend.collectionUpdates.pipe(
				Stream.runForEach((snapshot) => Queue.offer(received, snapshot)),
				Effect.forkScoped,
			);
			for (let step = 0; step < 10; step += 1) {
				yield* Effect.yieldNow();
			}

			listenerBox.current?.({
				status: 'collecting',
				trackCount: 4,
				skippedTrackCount: 1,
			});
			expect(yield* nextSnapshot(received)).toMatchObject({
				status: 'collecting',
				trackCount: 4,
				skippedTrackCount: 1,
			});

			respond({
				status: 'idle',
				trackCount: 2,
				source: 'likes-page',
			});
			yield* backend.refresh;
			expect(yield* nextSnapshot(received)).toMatchObject({
				status: 'idle',
				trackCount: 2,
				source: 'likes-page',
			});

			failSend('down');
			yield* backend.refresh;
			expect(yield* nextSnapshot(received)).toMatchObject({
				status: 'error',
				trackCount: 0,
				message: backgroundUnreachableMessage('down'),
			});

			respond('nope');
			yield* backend.refresh;
			const decoded = yield* nextSnapshot(received);
			expect(decoded.status).toBe('error');
			expect(
				decoded.message?.startsWith('Could not read extension state.'),
			).toBe(true);

			respond({ status: 'checking-login', trackCount: 0 });
			yield* backend.startCollection;
			expect(yield* nextSnapshot(received)).toMatchObject({
				status: 'checking-login',
				trackCount: 0,
			});

			respond('nope');
			yield* backend.startCollection.pipe(Effect.provide(logs.layer));
			expect(JSON.stringify(logs.messages())).toContain(
				'startCollection background responded with unexpected payload',
			);
			expect(yield* Queue.size(received)).toBe(0);

			failSend('closed');
			const startError = yield* backend.startCollection.pipe(Effect.flip);
			expect(startError.reason).toBe('closed');

			const beforeCancel = yield* Queue.size(received);
			respond({ status: 'idle', trackCount: 0 });
			yield* backend.cancelCollection;
			expect(sendToBackgroundMock).toHaveBeenCalledWith(
				expect.objectContaining({ _tag: 'CancelCollection' }),
			);
			expect(yield* Queue.size(received)).toBe(beforeCancel);

			respond({
				status: 'saving',
				trackCount: 2,
				exportBody: 'title,artist',
			});
			expect(yield* backend.downloadExport('csv')).toBe('title,artist');
			expect(sendToBackgroundMock).toHaveBeenCalledWith(
				expect.objectContaining({ _tag: 'DownloadExport', format: 'csv' }),
			);
			expect(yield* nextSnapshot(received)).toMatchObject({
				status: 'saving',
				trackCount: 2,
			});
			respond({ status: 'saving', trackCount: 2 });
			expect(yield* backend.downloadExport('json')).toBe('');
			expect(yield* nextSnapshot(received)).toMatchObject({
				status: 'saving',
				trackCount: 2,
			});

			const done = { status: 'done' as const, trackCount: 2 };
			respond(done);
			yield* backend.downloadSucceeded;
			yield* backend.downloadCancelled;
			yield* backend.downloadFailed({
				message: 'Could not save your export',
				reason: 'disk',
			});
			expect(yield* nextSnapshot(received)).toMatchObject(done);
			expect(yield* nextSnapshot(received)).toMatchObject(done);
			expect(yield* nextSnapshot(received)).toMatchObject(done);
			expect(sendToBackgroundMock).toHaveBeenCalledWith(
				expect.objectContaining({
					_tag: 'DownloadFailed',
					message: 'Could not save your export',
					reason: 'disk',
				}),
			);
		}),
	);

	effectIt.scoped('unsubscribes the listener when the layer scope closes', () =>
		Effect.gen(function* () {
			unsubscribe.mockClear();
			yield* Effect.scoped(
				CollectionBackendTag.pipe(
					Effect.provide(
						CollectionBackendLegacy.pipe(Layer.provideMerge(silentLoggerLayer)),
					),
				),
			);
			expect(unsubscribe).toHaveBeenCalledTimes(1);
		}),
	);
});
