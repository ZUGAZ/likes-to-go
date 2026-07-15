import { Effect, Runtime } from 'effect';
import { batch, createEffect, createSignal, on, onMount, untrack } from 'solid-js';

import {
	decodeGetStateResponse,
	getState,
	sendToBackgroundEffect,
} from '@/common/infrastructure/chrome-messaging';
import { getResolvedPopupThemeEffect } from '@/common/infrastructure/get-resolved-popup-theme';
import {
	listenForStateUpdatesEffect,
	type StateUpdatePayload,
} from '@/common/infrastructure/listen-for-state-updates';
import {
	CancelCollectionRequest,
	DownloadExportRequest,
	StartCollectionRequest,
} from '@/common/model/request-message';
import type { ResolvedPopupTheme } from '@/common/model/soundcloud-theme';
import type { ViewModelEffect } from '@/common/viewmodel/bind-viewmodel';
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
	readonly effects: {
		readonly syncState: ViewModelEffect;
		readonly retryAfterError: ViewModelEffect;
		readonly startCollection: ViewModelEffect;
		readonly cancelCollection: ViewModelEffect;
		readonly download: ViewModelEffect;
		readonly handleAction: (actionId: BeatActionId) => ViewModelEffect;
	};
	readonly teardown: () => void;
}

export interface MascotViewModelOptions {
	readonly runtime: Runtime.Runtime<never>;
	readonly visibility: MascotVisibilityControls;
	readonly resolvePoseUrl: (pose: BeatPoseKey) => string;
}

export function createMascotViewModel(
	vmOptions: MascotViewModelOptions,
): MascotViewModel {
	const { runtime, visibility, resolvePoseUrl } = vmOptions;

	const boot = initializingBeatModel();
	const [state, setState] = createSignal<BeatState>(boot.state);
	const [theme, setTheme] = createSignal<ResolvedPopupTheme>('light');
	const [trackCount, setTrackCount] = createSignal(boot.trackCount);
	const [message, setMessage] = createSignal<string | undefined>(boot.message);
	const [skippedTrackCount, setSkippedTrackCount] = createSignal(
		boot.skippedTrackCount ?? 0,
	);
	const [source, setSource] = createSignal<BeatSource>(boot.source);

	let currentSource = boot.source;

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

	const applyModel = (model: BeatModel): void => {
		batch(() => {
			setState(model.state);
			setTrackCount(model.trackCount);
			setMessage(model.message);
			setSkippedTrackCount(model.skippedTrackCount ?? 0);
			currentSource = model.source;
			setSource(model.source);
		});
	};

	const applyGetStateResponse = (response: StateUpdatePayload): void => {
		applyModel({
			state: mapStatusToBeatState(response.status),
			trackCount: response.trackCount,
			message: response.message,
			skippedTrackCount: response.skippedTrackCount,
			source: response.source ?? currentSource,
		});
	};

	const setToInitial = (): void => {
		applyModel(initialBeatModel());
	};

	const setToLoading = (): void => {
		applyModel(loadingBeatModel());
	};

	const stopListening = Effect.runSync(
		listenForStateUpdatesEffect(applyGetStateResponse),
	);

	const syncTheme = getResolvedPopupThemeEffect().pipe(Effect.tap(setTheme));

	const syncState = Effect.gen(function* () {
		yield* Effect.log('mascot syncState start');
		yield* syncTheme;
		yield* getState().pipe(Effect.tap(applyGetStateResponse));
		yield* Effect.log('mascot syncState complete');
	});

	const startCollection = Effect.gen(function* () {
		yield* Effect.log('startCollection begin');
		setToLoading();
		yield* sendToBackgroundEffect(StartCollectionRequest()).pipe(
			Effect.flatMap(decodeGetStateResponse),
			Effect.tap(applyGetStateResponse),
			Effect.tap((response) =>
				Effect.log('startCollection background responded', {
					status: response.status,
					trackCount: response.trackCount,
				}),
			),
			Effect.catchTag('SendToBackgroundFailed', (err) =>
				Effect.logWarning('startCollection send failed', err.reason).pipe(
					Effect.zipRight(
						Effect.sync(() => {
							applyModel({
								state: 'error',
								trackCount: 0,
								message: err.reason,
								skippedTrackCount: undefined,
								source: currentSource,
							});
						}),
					),
				),
			),
			Effect.catchTag('DecodeGetStateResponseFailed', (err) =>
				Effect.logWarning(
					'startCollection background responded with unexpected payload',
					err.reason,
				),
			),
		);
	});

	const retryAfterError = Effect.gen(function* () {
		const shouldDismissError = untrack(() => state() === 'error');
		applyModel(initializingBeatModel());
		if (shouldDismissError) {
			yield* sendToBackgroundEffect(CancelCollectionRequest());
		}
		yield* getState().pipe(Effect.tap(applyGetStateResponse));
	});

	const cancelCollection = Effect.gen(function* () {
		yield* sendToBackgroundEffect(CancelCollectionRequest());
		setToInitial();
	});

	const download = sendToBackgroundEffect(DownloadExportRequest()).pipe(
		Effect.flatMap(decodeGetStateResponse),
		Effect.tap(applyGetStateResponse),
		Effect.catchAll(() => Effect.sync(setToInitial)),
	);

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
		stopListening();
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
		effects: {
			syncState,
			retryAfterError,
			startCollection,
			cancelCollection,
			download,
			handleAction,
		},
		teardown,
	};
}
