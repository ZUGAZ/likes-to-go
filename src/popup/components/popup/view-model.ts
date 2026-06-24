import { Effect } from 'effect';
import { batch, createSignal, untrack } from 'solid-js';

import {
	decodeGetStateResponse,
	getState,
	sendToBackgroundEffect,
} from '@/common/infrastructure/chrome-messaging';
import {
	listenForStateUpdatesEffect,
	type StateUpdatePayload,
} from '@/common/infrastructure/listen-for-state-updates';
import { getResolvedPopupThemeEffect } from '@/common/infrastructure/get-resolved-popup-theme';
import {
	CancelCollectionRequest,
	DownloadExportRequest,
	StartCollectionRequest,
} from '@/common/model/request-message';
import type { ResolvedPopupTheme } from '@/common/model/soundcloud-theme';
import type { ViewModelEffect } from '@/common/viewmodel/bind-viewmodel';
import {
	initialPopupModel,
	initializingPopupModel,
	loadingPopupModel,
	mapSourceToCopy,
	mapStateToBusy,
	mapStateToLiveStatusMessage,
	mapStatusToPopupState,
	type PopupModel,
	type PopupSource,
	type PopupState,
} from '@/popup/components/popup/model';

export interface PopupViewModel {
	readonly theme: () => ResolvedPopupTheme;
	readonly state: () => PopupState;
	readonly trackCount: () => number;
	readonly message: () => string | undefined;
	readonly skippedTrackCount: () => number;
	readonly source: () => PopupSource;
	readonly sourceCopy: () => string;
	readonly isStatusBusy: () => boolean;
	readonly liveStatusMessage: () => string | undefined;
	readonly effects: {
		readonly syncState: ViewModelEffect;
		readonly retryAfterError: ViewModelEffect;
		readonly startCollection: ViewModelEffect;
		readonly cancelCollection: ViewModelEffect;
		readonly download: ViewModelEffect;
	};
	readonly teardown: () => void;
}

export function createPopupViewModel(): PopupViewModel {
	const boot = initializingPopupModel();
	const [state, setState] = createSignal<PopupState>(boot.state);
	const [theme, setTheme] = createSignal<ResolvedPopupTheme>('light');
	const [trackCount, setTrackCount] = createSignal(boot.trackCount);
	const [message, setMessage] = createSignal<string | undefined>(boot.message);
	const [skippedTrackCount, setSkippedTrackCount] = createSignal(
		boot.skippedTrackCount ?? 0,
	);
	const [source, setSource] = createSignal<PopupSource>(boot.source);
	const sourceCopy = (): string => mapSourceToCopy(source());
	const isStatusBusy = (): boolean => mapStateToBusy(state());
	const liveStatusMessage = (): string | undefined =>
		mapStateToLiveStatusMessage(state(), trackCount());
	let currentSource = boot.source;

	const applyModel = (model: PopupModel): void => {
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
			state: mapStatusToPopupState(response.status),
			trackCount: response.trackCount,
			message: response.message,
			skippedTrackCount: response.skippedTrackCount,
			source: response.source ?? currentSource,
		});
	};

	const setToInitial = (): void => {
		applyModel(initialPopupModel());
	};

	const setToLoading = (): void => {
		applyModel(loadingPopupModel());
	};

	const stopListening = Effect.runSync(
		listenForStateUpdatesEffect(applyGetStateResponse),
	);

	const syncTheme = getResolvedPopupThemeEffect().pipe(Effect.tap(setTheme));

	const syncState = Effect.gen(function* () {
		yield* syncTheme;
		yield* getState().pipe(Effect.tap(applyGetStateResponse));
	});

	const startCollection = Effect.gen(function* () {
		setToLoading();
		yield* sendToBackgroundEffect(StartCollectionRequest()).pipe(
			Effect.catchAll((err) =>
				Effect.sync(() => {
					applyModel({
						state: 'error',
						trackCount: 0,
						message: err.message,
						skippedTrackCount: undefined,
						source: currentSource,
					});
				}),
			),
		);
	});

	const retryAfterError = Effect.gen(function* () {
		const shouldDismissError = untrack(() => state() === 'error');
		applyModel(initializingPopupModel());
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

	const teardown = (): void => {
		stopListening();
	};

	return {
		theme,
		state,
		trackCount,
		message,
		skippedTrackCount,
		source,
		sourceCopy,
		isStatusBusy,
		liveStatusMessage,
		effects: {
			syncState,
			retryAfterError,
			startCollection,
			cancelCollection,
			download,
		},
		teardown,
	};
}
