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
	type PopupState,
} from '@/popup/components/popup/model';

export interface PopupViewModel {
	readonly state: () => PopupState;
	readonly trackCount: () => number;
	readonly errorMessage: () => string | undefined;
	readonly skippedTrackCount: () => number;
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
	const [errorMessage, setErrorMessage] = createSignal<string | undefined>(
		boot.errorMessage,
	);
	const [skippedTrackCount, setSkippedTrackCount] = createSignal(
		boot.skippedTrackCount ?? 0,
	);

	const applyModel = (model: PopupModel): void => {
		batch(() => {
			setState(model.state);
			setTrackCount(model.trackCount);
			setErrorMessage(
				model.state === 'error'
					? (model.errorMessage ?? 'Something went wrong')
					: undefined,
			);
			setSkippedTrackCount(model.skippedTrackCount ?? 0);
		});
	};

	const applyGetStateResponse = (response: StateUpdatePayload): void => {
		applyModel({
			state: mapStatusToPopupState(response.status),
			trackCount: response.trackCount,
			errorMessage: response.errorMessage,
			skippedTrackCount: response.skippedTrackCount,
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
						errorMessage: err.message,
						skippedTrackCount: undefined,
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
		errorMessage,
		skippedTrackCount,
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
