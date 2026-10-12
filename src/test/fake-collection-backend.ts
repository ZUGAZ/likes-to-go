import type { ExportUnavailable } from '@/common/model/messaging/background-rpcs';
import {
	BackgroundUnreachable,
	CollectionBackendTag,
	type CollectionBackend,
	type CollectionSnapshot,
	type DownloadFailure,
} from '@/mascot/collection-backend';
import { Effect, Either, Layer, Queue, Ref, Stream } from 'effect';

export interface FakeCollectionBackend {
	readonly layer: Layer.Layer<CollectionBackendTag>;
	readonly emit: (snapshot: CollectionSnapshot) => Effect.Effect<void>;
	readonly end: (reason: string) => Effect.Effect<void>;
	readonly calls: Ref.Ref<ReadonlyArray<string>>;
	readonly failNext: (
		name: string,
		error: BackgroundUnreachable | ExportUnavailable,
	) => Effect.Effect<void>;
	readonly exportBody: Ref.Ref<
		Effect.Effect<string, ExportUnavailable | BackgroundUnreachable>
	>;
}

type PendingFailure = {
	readonly name: string;
	readonly error: BackgroundUnreachable | ExportUnavailable;
};

const isUnreachable = (
	error: BackgroundUnreachable | ExportUnavailable,
): error is BackgroundUnreachable => 'reason' in error;

export const makeFakeCollectionBackend: Effect.Effect<FakeCollectionBackend> =
	Effect.gen(function* () {
		const updates =
			yield* Queue.unbounded<Either.Either<CollectionSnapshot, string>>();
		const calls = yield* Ref.make<ReadonlyArray<string>>([]);
		const pending = yield* Ref.make<ReadonlyArray<PendingFailure>>([]);
		const exportBody = yield* Ref.make<
			Effect.Effect<string, ExportUnavailable | BackgroundUnreachable>
		>(Effect.succeed(''));

		const record = (name: string) =>
			Ref.update(calls, (current) => [...current, name]);

		const takeFailure = (name: string) =>
			Ref.modify(pending, (current) => {
				const index = current.findIndex((entry) => entry.name === name);
				const match = index < 0 ? undefined : current[index];
				if (match === undefined) {
					return [undefined, current] as const;
				}
				return [
					match.error,
					[...current.slice(0, index), ...current.slice(index + 1)],
				] as const;
			});

		const runCommand = (
			name: string,
		): Effect.Effect<void, BackgroundUnreachable> =>
			Effect.gen(function* () {
				yield* record(name);
				const failure = yield* takeFailure(name);
				if (failure !== undefined && isUnreachable(failure)) {
					return yield* Effect.fail(failure);
				}
				if (failure !== undefined) {
					return yield* Effect.die(
						'this command only fails with BackgroundUnreachable',
					);
				}
			}).pipe(Effect.asVoid);

		const backend: CollectionBackend = {
			collectionUpdates: Stream.fromQueue(updates).pipe(
				Stream.mapEffect(
					Either.match({
						onLeft: (reason) =>
							Effect.fail(new BackgroundUnreachable({ reason })),
						onRight: (snapshot) => Effect.succeed(snapshot),
					}),
				),
			),
			refresh: runCommand('refresh'),
			startCollection: runCommand('startCollection'),
			cancelCollection: runCommand('cancelCollection'),
			downloadExport: (format) =>
				Effect.gen(function* () {
					const name = `downloadExport:${format}`;
					yield* record(name);
					const failure = yield* takeFailure(name);
					if (failure !== undefined) {
						return yield* Effect.fail(failure);
					}
					return yield* Ref.get(exportBody).pipe(Effect.flatten);
				}),
			downloadSucceeded: runCommand('downloadSucceeded'),
			downloadCancelled: runCommand('downloadCancelled'),
			downloadFailed: (failure: DownloadFailure) =>
				runCommand(`downloadFailed:${failure.message}|${failure.reason}`),
		};

		return {
			layer: Layer.succeed(CollectionBackendTag, backend),
			emit: (snapshot) =>
				Queue.offer(updates, Either.right(snapshot)).pipe(Effect.asVoid),
			end: (reason) =>
				Queue.offer(updates, Either.left(reason)).pipe(Effect.asVoid),
			calls,
			failNext: (name, error) =>
				Ref.update(pending, (current) => [...current, { name, error }]),
			exportBody,
		};
	});
