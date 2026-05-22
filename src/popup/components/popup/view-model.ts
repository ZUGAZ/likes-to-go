import { Effect } from 'effect';
import { batch, createSignal } from 'solid-js';

import {
	decodeGetStateResponse,
	getState,
	listenForStateUpdates,
	sendToBackgroundEffect,
} from '@/common/infrastructure/chrome-messaging';
import type { StateUpdatePayload } from '@/common/infrastructure/listen-for-state-updates';
import {
	CancelCollectionRequest,
	DownloadExportRequest,
	StartCollectionRequest,
} from '@/common/model/request-message';
import type { ViewModelEffect } from '@/common/viewmodel/bind-viewmodel';
import {
	initialPopupModel,
	initializingPopupModel,
	loadingPopupModel,
	mapStatusToPopupState,
	type PopupModel,
	type PopupSource,
	type PopupState,
} from '@/popup/components/popup/model';

export interface PopupViewModel {
	readonly state: () => PopupState;
	readonly trackCount: () => number;
	readonly message: () => string | undefined;
	readonly skippedTrackCount: () => number;
	readonly source: () => PopupSource;
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
	const [trackCount, setTrackCount] = createSignal(boot.trackCount);
	const [message, setMessage] = createSignal<string | undefined>(boot.message);
	const [skippedTrackCount, setSkippedTrackCount] = createSignal(
		boot.skippedTrackCount ?? 0,
	);
	const [source, setSource] = createSignal<PopupSource>(boot.source);
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

	const stopListening = listenForStateUpdates(applyGetStateResponse);

	const syncState = getState().pipe(Effect.tap(applyGetStateResponse));

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
		applyModel(initializingPopupModel());
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
		state,
		trackCount,
		message,
		skippedTrackCount,
		source,
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
