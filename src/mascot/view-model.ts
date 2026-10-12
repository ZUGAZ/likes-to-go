import { Context, Effect, Fiber, Option, Runtime, Stream } from 'effect';
import {
	batch,
	createEffect,
	createSignal,
	on,
	onMount,
	untrack,
} from 'solid-js';

import {
	awaitSaveFilePicker,
	startSaveFilePicker,
	writeTextFile,
} from '@/common/infrastructure/save-file-picker';
import { getResolvedPopupThemeEffect } from '@/common/infrastructure/get-resolved-popup-theme';
import { backgroundUnreachableMessage } from '@/common/model/background-unreachable-message';
import { exportBackupFilename } from '@/common/model/export-backup-filename';
import type { ExportFormatId } from '@/common/model/export-format/export-format-id';
import {
	defaultExportFormatId,
	getExportFormat,
	listExportFormats,
} from '@/common/model/export-format/registry';
import type { ResolvedPopupTheme } from '@/common/model/soundcloud-theme';
import type { ViewModelEffect } from '@/common/viewmodel/bind-viewmodel';
import type { ExportFormatStickerRow } from '@/mascot/export-format-sticker-rows';
import {
	CollectionBackendTag,
	type BackgroundUnreachable,
	type CollectionSnapshot,
	type DownloadFailure,
} from '@/mascot/collection-backend';
import {
	initialBeatModel,
	initializingBeatModel,
	loadingBeatModel,
	mapStateToBalloonCopy,
	mapStateToBusy,
	mapStateToFootnote,
	mapStateToLiveMessage,
	mapStateToOptions,
	mapStateToPose,
	mapStatusToBeatState,
	type BeatModel,
	type BeatSource,
	type BeatState,
} from '@/mascot/model';
import type {
	BeatActionId,
	BeatPersonaOption,
	BeatPoseKey,
} from '@/mascot/persona';
import type { MascotVisibilityControls } from '@/mascot/visibility';

export interface MascotViewModel {
	readonly theme: () => ResolvedPopupTheme;
	readonly state: () => BeatState;
	readonly trackCount: () => number;
	readonly message: () => string | undefined;
	readonly skippedTrackCount: () => number;
	readonly source: () => BeatSource;
	readonly isStatusBusy: () => boolean;
	readonly isVisible: () => boolean;
	readonly pose: () => BeatPoseKey;
	readonly poseUrl: () => string;
	readonly balloonCopy: () => string;
	readonly options: () => ReadonlyArray<BeatPersonaOption>;
	readonly liveStatusMessage: () => string | undefined;
	readonly footnoteCopy: () => string | undefined;
	readonly selectedExportFormatId: () => ExportFormatId;
	readonly exportFormatRows: () => ReadonlyArray<ExportFormatStickerRow>;
	readonly selectExportFormat: (id: string) => void;
	readonly effects: {
		readonly syncState: ViewModelEffect;
		readonly retryAfterError: ViewModelEffect;
		readonly startCollection: ViewModelEffect;
		readonly cancelCollection: ViewModelEffect;
		readonly download: ViewModelEffect;
		readonly dismiss: ViewModelEffect;
		readonly handleAction: (actionId: BeatActionId) => ViewModelEffect;
	};
	readonly teardown: () => void;
}

export interface MascotViewModelOptions {
	readonly runtime: Runtime.Runtime<CollectionBackendTag>;
	readonly visibility: MascotVisibilityControls;
	readonly resolvePoseUrl: (pose: BeatPoseKey) => string;
	readonly onSurfaceDismiss: () => void;
}

export function createMascotViewModel(
	vmOptions: MascotViewModelOptions,
): MascotViewModel {
	const { runtime, visibility, resolvePoseUrl, onSurfaceDismiss } = vmOptions;
	const backend = Context.get(runtime.context, CollectionBackendTag);

	const boot = initializingBeatModel();
	const [state, setState] = createSignal<BeatState>(boot.state);
	const [theme, setTheme] = createSignal<ResolvedPopupTheme>('light');
	const [trackCount, setTrackCount] = createSignal(boot.trackCount);
	const [message, setMessage] = createSignal<string | undefined>(boot.message);
	const [skippedTrackCount, setSkippedTrackCount] = createSignal(
		boot.skippedTrackCount ?? 0,
	);
	const [source, setSource] = createSignal<BeatSource>(boot.source);
	const [selectedExportFormatId, setSelectedExportFormatId] =
		createSignal<ExportFormatId>(defaultExportFormatId());

	let currentSource = boot.source;
	let savePickerAbort: AbortController | undefined;
	let latestSnapshot: Option.Option<CollectionSnapshot> = Option.none();

	const isStatusBusy = (): boolean => mapStateToBusy(state());

	const buildCopyContext = () => ({
		trackCount: trackCount(),
		skippedTrackCount: skippedTrackCount(),
		source: source(),
		message: message(),
	});

	const pose = (): BeatPoseKey => mapStateToPose(state());
	const poseUrl = (): string => resolvePoseUrl(pose());
	const balloonCopy = (): string =>
		mapStateToBalloonCopy(state(), buildCopyContext());
	const options = (): ReadonlyArray<BeatPersonaOption> =>
		mapStateToOptions(state());
	const liveStatusMessage = (): string | undefined =>
		mapStateToLiveMessage(state(), buildCopyContext());
	const footnoteCopy = (): string | undefined =>
		mapStateToFootnote(state(), buildCopyContext());

	const exportFormatRows = (): ReadonlyArray<ExportFormatStickerRow> =>
		listExportFormats().map((format) => ({
			id: format.id,
			label: format.label,
			worksWith: format.worksWith,
		}));

	const selectExportFormat = (id: string): void => {
		const format = listExportFormats().find((entry) => entry.id === id);
		if (format === undefined) {
			return;
		}
		setSelectedExportFormatId(format.id);
	};

	const applyModel = (model: BeatModel): void => {
		const previousState = untrack(state);
		batch(() => {
			setState(model.state);
			setTrackCount(model.trackCount);
			setMessage(model.message);
			setSkippedTrackCount(model.skippedTrackCount ?? 0);
			currentSource = model.source;
			setSource(model.source);
			if (
				model.state === 'initial' ||
				(model.state === 'done' &&
					previousState !== 'saving' &&
					previousState !== 'done')
			) {
				setSelectedExportFormatId(defaultExportFormatId());
			}
		});
	};

	const applySnapshot = (snapshot: CollectionSnapshot): void => {
		applyModel({
			state: mapStatusToBeatState(snapshot.status),
			trackCount: snapshot.trackCount,
			message: snapshot.message,
			skippedTrackCount: snapshot.skippedTrackCount,
			source: snapshot.source ?? currentSource,
		});
	};

	const onSnapshot = (snapshot: CollectionSnapshot): void => {
		latestSnapshot = Option.some(snapshot);
		applySnapshot(snapshot);
	};

	const setToInitial = (): void => {
		applyModel(initialBeatModel());
	};

	const setToLoading = (): void => {
		applyModel(loadingBeatModel());
	};

	const setToSaving = (): void => {
		applyModel({
			state: 'saving',
			trackCount: untrack(trackCount),
			message: undefined,
			skippedTrackCount: untrack(skippedTrackCount),
			source: currentSource,
		});
	};

	const applyUnreachable = (error: BackgroundUnreachable) =>
		Effect.logWarning('collection updates ended', error.reason).pipe(
			Effect.zipRight(
				Effect.sync(() => {
					applyModel({
						state: 'error',
						trackCount: untrack(trackCount),
						message: backgroundUnreachableMessage(error.reason),
						skippedTrackCount: untrack(skippedTrackCount),
						source: currentSource,
					});
				}),
			),
		);

	const reportDownloadFailure = (failure: DownloadFailure) =>
		backend.downloadFailed(failure).pipe(Effect.ignore);

	const subscription = Runtime.runFork(runtime)(
		backend.collectionUpdates.pipe(
			Stream.runForEach((snapshot) => Effect.sync(() => onSnapshot(snapshot))),
			Effect.catchTag('BackgroundUnreachable', applyUnreachable),
			Effect.withLogSpan('collectionUpdates'),
		),
	);

	const syncTheme = getResolvedPopupThemeEffect().pipe(Effect.tap(setTheme));

	const syncState = Effect.gen(function* () {
		yield* Effect.log('mascot syncState start');
		yield* syncTheme;
		yield* backend.refresh.pipe(
			Effect.catchTag('BackgroundUnreachable', (error) =>
				Effect.logWarning('refresh failed', error.reason),
			),
		);
		yield* Effect.log('mascot syncState complete');
	});

	const startCollection = Effect.gen(function* () {
		yield* Effect.log('startCollection begin');
		setToLoading();
		yield* backend.startCollection.pipe(
			Effect.tap(() => Effect.log('startCollection accepted')),
			Effect.catchTag('BackgroundUnreachable', (error) =>
				Effect.logWarning('startCollection send failed', error.reason).pipe(
					Effect.zipRight(
						Effect.sync(() => {
							applyModel({
								state: 'error',
								trackCount: 0,
								message: error.reason,
								skippedTrackCount: undefined,
								source: currentSource,
							});
						}),
					),
				),
			),
		);
	});

	const retryAfterError = Effect.gen(function* () {
		applyModel(initializingBeatModel());
		if (
			Option.exists(latestSnapshot, (snapshot) => snapshot.status === 'error')
		) {
			yield* backend.cancelCollection;
		}
		yield* backend.refresh;
		yield* Option.match(latestSnapshot, {
			onNone: () => Effect.sync(setToInitial),
			onSome: (snapshot) => Effect.sync(() => applySnapshot(snapshot)),
		});
	});

	const cancelCollection = Effect.gen(function* () {
		yield* backend.cancelCollection;
		setToInitial();
	});

	const download = Effect.gen(function* () {
		const formatId = untrack(selectedExportFormatId);
		const format = getExportFormat(formatId);
		const pickerAbort = new AbortController();
		savePickerAbort = pickerAbort;
		const pending = yield* startSaveFilePicker(
			exportBackupFilename(new Date(), format.extension),
			format.pickerTypes,
			pickerAbort.signal,
		).pipe(
			Effect.catchTag('SaveFilePickerUnavailable', (error) =>
				Effect.sync(() => {
					applyModel({
						state: 'error',
						trackCount: untrack(trackCount),
						message: 'Could not open the save dialog. Want to try again?',
						skippedTrackCount: untrack(skippedTrackCount),
						source: currentSource,
					});
				}).pipe(Effect.zipRight(Effect.fail(error))),
			),
		);
		void pending.promise.then(
			() => undefined,
			() => undefined,
		);
		setToSaving();

		const body = yield* backend.downloadExport(formatId).pipe(
			Effect.catchTags({
				BackgroundUnreachable: (error) =>
					reportDownloadFailure({
						message: 'Could not save your export',
						reason: error.reason,
					}).pipe(Effect.zipRight(Effect.fail(error))),
				ExportUnavailable: () => Effect.succeed(''),
			}),
		);

		if (body.length === 0) {
			yield* awaitSaveFilePicker(pending).pipe(Effect.ignore);
			yield* reportDownloadFailure({
				message: 'Could not save your export',
				reason: 'Export payload was missing',
			});
			return;
		}

		const handle = yield* awaitSaveFilePicker(pending).pipe(
			Effect.catchTag('SaveFilePickerCancelled', (error) =>
				backend.downloadCancelled.pipe(
					Effect.ignore,
					Effect.zipRight(Effect.fail(error)),
				),
			),
			Effect.catchTag('SaveFilePickerUnavailable', (error) =>
				reportDownloadFailure({
					message: 'Could not save your export',
					reason: error.reason,
				}).pipe(Effect.zipRight(Effect.fail(error))),
			),
		);

		yield* writeTextFile(handle, body).pipe(
			Effect.catchTag('SaveFileWriteFailed', (error) =>
				reportDownloadFailure({
					message: 'Could not save your export',
					reason: error.reason,
				}).pipe(Effect.zipRight(Effect.fail(error))),
			),
		);

		yield* backend.downloadSucceeded.pipe(Effect.ignore);
	}).pipe(Effect.catchAll(() => Effect.void));

	const dismiss = Effect.gen(function* () {
		const abort = savePickerAbort;
		savePickerAbort = undefined;
		abort?.abort();
		const current = untrack(state);
		if (current === 'done' || current === 'saving') {
			yield* backend.cancelCollection.pipe(Effect.ignore);
			setToInitial();
		}
		yield* Effect.sync(() => {
			onSurfaceDismiss();
		});
	});

	const handleAction = (actionId: BeatActionId): ViewModelEffect => {
		switch (actionId) {
			case 'start':
				return startCollection;
			case 'cancel':
				return cancelCollection;
			case 'download':
				return download;
			case 'retry':
				return retryAfterError;
		}
	};

	const teardown = (): void => {
		Runtime.runFork(runtime)(Fiber.interrupt(subscription));
	};

	onMount(() => {
		void Runtime.runPromise(runtime)(syncState);
	});

	createEffect(
		on(
			() => visibility.isVisible(),
			(visible, wasVisible) => {
				if (visible && wasVisible === false) {
					void Runtime.runPromise(runtime)(syncState);
				}
			},
			{ defer: true },
		),
	);

	return {
		theme,
		state,
		trackCount,
		message,
		skippedTrackCount,
		source,
		isStatusBusy,
		isVisible: visibility.isVisible,
		pose,
		poseUrl,
		balloonCopy,
		options,
		liveStatusMessage,
		footnoteCopy,
		selectedExportFormatId,
		exportFormatRows,
		selectExportFormat,
		effects: {
			syncState,
			retryAfterError,
			startCollection,
			cancelCollection,
			download,
			dismiss,
			handleAction,
		},
		teardown,
	};
}
