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
	mapStatusToPopupState,
	processingPopupModel,
	type PopupModel,
	type PopupState,
} from '@/popup/components/popup/model';

export interface PopupViewModel {
	readonly state: () => PopupState;
	readonly trackCount: () => number;
	readonly errorMessage: () => string | undefined;
	readonly effects: {
		readonly syncState: ViewModelEffect;
		readonly startCollection: ViewModelEffect;
		readonly cancelCollection: ViewModelEffect;
		readonly download: ViewModelEffect;
	};
	readonly teardown: () => void;
}

export function createPopupViewModel(): PopupViewModel {
	const [state, setState] = createSignal<PopupState>('initial');
	const [trackCount, setTrackCount] = createSignal(0);
	const [errorMessage, setErrorMessage] = createSignal<string | undefined>();

	const applyModel = (model: PopupModel): void => {
		batch(() => {
			setState(model.state);
			setTrackCount(model.trackCount);
			setErrorMessage(model.errorMessage);
		});
	};

	const applyGetStateResponse = (response: StateUpdatePayload): void => {
		applyModel({
			state: mapStatusToPopupState(response.status),
			trackCount: response.trackCount,
			errorMessage: response.errorMessage,
		});
	};

	const setToInitial = (): void => {
		applyModel(initialPopupModel());
	};

	const setToProcessing = (): void => {
		applyModel(processingPopupModel());
	};

	const stopListening = listenForStateUpdates(applyGetStateResponse);

	const syncState = getState().pipe(Effect.tap(applyGetStateResponse));

	const startCollection = Effect.gen(function* () {
		yield* sendToBackgroundEffect(StartCollectionRequest());
		setToProcessing();
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
		effects: {
			syncState,
			startCollection,
			cancelCollection,
			download,
		},
		teardown,
	};
}
