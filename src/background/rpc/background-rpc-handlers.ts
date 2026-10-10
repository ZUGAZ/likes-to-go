import { DispatchLaneTag } from '@/background/dispatch-lane';
import {
	cancelCollectionJob,
	dispatchJob,
	downloadExportJob,
	startCollectionJob,
} from '@/background/rpc/background-rpc-jobs';
import { watchCollectionView } from '@/background/rpc/collection-view-stream';
import { CollectionComplete } from '@/common/model/collection/events/collection-complete';
import { CollectionError } from '@/common/model/collection/events/collection-error';
import { CollectionVisibilityPaused } from '@/common/model/collection/events/collection-visibility-paused';
import { CollectionVisibilityResumed } from '@/common/model/collection/events/collection-visibility-resumed';
import { DownloadCancelled } from '@/common/model/collection/events/download-cancelled';
import { DownloadFailed } from '@/common/model/collection/events/download-failed';
import { DownloadSucceeded } from '@/common/model/collection/events/download-succeeded';
import { GetStateRequested } from '@/common/model/collection/events/get-state-requested';
import { LoginRequired } from '@/common/model/collection/events/login-required';
import { TracksBatch } from '@/common/model/collection/events/tracks-batch';
import { BackgroundRpcs } from '@/common/model/messaging/background-rpcs';
import { Caller } from 'browser-extension-kit/messaging';
import { Effect, Stream } from 'effect';

const logIncoming = (tag: string, callerTag: string) =>
	Effect.log('incoming rpc', tag, callerTag);

export const BackgroundRpcHandlersLive = BackgroundRpcs.toLayer(
	Effect.gen(function* () {
		const lane = yield* DispatchLaneTag;

		return BackgroundRpcs.of({
			StartCollection: () =>
				Effect.gen(function* () {
					const caller = yield* Caller;
					yield* lane.submit(startCollectionJob(caller));
					yield* logIncoming('StartCollection', caller._tag);
				}).pipe(Effect.withLogSpan('BackgroundRpc')),
			CancelCollection: () =>
				Effect.gen(function* () {
					const caller = yield* Caller;
					yield* lane.submit(cancelCollectionJob(caller));
					yield* logIncoming('CancelCollection', caller._tag);
				}).pipe(Effect.withLogSpan('BackgroundRpc')),
			DownloadExport: ({ format }) =>
				Effect.gen(function* () {
					const caller = yield* Caller;
					const text = yield* lane.submitAndAwait(
						downloadExportJob(caller, format),
					);
					yield* logIncoming('DownloadExport', caller._tag);
					return text;
				}).pipe(Effect.withLogSpan('BackgroundRpc')),
			DownloadSucceeded: () =>
				Effect.gen(function* () {
					yield* lane.submit(dispatchJob(DownloadSucceeded()));
					yield* logIncoming('DownloadSucceeded', (yield* Caller)._tag);
				}).pipe(Effect.withLogSpan('BackgroundRpc')),
			DownloadCancelled: () =>
				Effect.gen(function* () {
					yield* lane.submit(dispatchJob(DownloadCancelled()));
					yield* logIncoming('DownloadCancelled', (yield* Caller)._tag);
				}).pipe(Effect.withLogSpan('BackgroundRpc')),
			DownloadFailed: ({ message, reason }) =>
				Effect.gen(function* () {
					yield* lane.submit(dispatchJob(DownloadFailed({ message, reason })));
					yield* logIncoming('DownloadFailed', (yield* Caller)._tag);
				}).pipe(Effect.withLogSpan('BackgroundRpc')),
			RefreshCollectionState: () =>
				Effect.gen(function* () {
					yield* lane.submit(dispatchJob(GetStateRequested()));
					yield* logIncoming('RefreshCollectionState', (yield* Caller)._tag);
				}).pipe(Effect.withLogSpan('BackgroundRpc')),
			WatchCollectionState: () =>
				Stream.unwrap(
					Effect.gen(function* () {
						const caller = yield* Caller;
						yield* logIncoming('WatchCollectionState', caller._tag);
						return watchCollectionView;
					}).pipe(Effect.withLogSpan('BackgroundRpc')),
				),
			TracksBatch: ({ tracks, skippedTrackCount }) =>
				Effect.gen(function* () {
					yield* lane.submit(
						dispatchJob(TracksBatch({ tracks, skippedTrackCount })),
					);
					yield* logIncoming('TracksBatch', (yield* Caller)._tag);
				}).pipe(Effect.withLogSpan('BackgroundRpc')),
			CollectionComplete: () =>
				Effect.gen(function* () {
					yield* lane.submit(dispatchJob(CollectionComplete()));
					yield* logIncoming('CollectionComplete', (yield* Caller)._tag);
				}).pipe(Effect.withLogSpan('BackgroundRpc')),
			CollectionVisibilityPaused: () =>
				Effect.gen(function* () {
					yield* lane.submit(dispatchJob(CollectionVisibilityPaused()));
					yield* logIncoming(
						'CollectionVisibilityPaused',
						(yield* Caller)._tag,
					);
				}).pipe(Effect.withLogSpan('BackgroundRpc')),
			CollectionVisibilityResumed: () =>
				Effect.gen(function* () {
					yield* lane.submit(dispatchJob(CollectionVisibilityResumed()));
					yield* logIncoming(
						'CollectionVisibilityResumed',
						(yield* Caller)._tag,
					);
				}).pipe(Effect.withLogSpan('BackgroundRpc')),
			CollectionError: ({ message, reason }) =>
				Effect.gen(function* () {
					yield* lane.submit(dispatchJob(CollectionError({ message, reason })));
					yield* logIncoming('CollectionError', (yield* Caller)._tag);
				}).pipe(Effect.withLogSpan('BackgroundRpc')),
			LoginRequired: ({ message, reason }) =>
				Effect.gen(function* () {
					yield* lane.submit(dispatchJob(LoginRequired({ message, reason })));
					yield* logIncoming('LoginRequired', (yield* Caller)._tag);
				}).pipe(Effect.withLogSpan('BackgroundRpc')),
		});
	}),
);
