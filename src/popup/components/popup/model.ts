export type PopupCollectionStatus = 'idle' | 'collecting' | 'done' | 'error';

export type PopupState =
	| 'initializing'
	| 'initial'
	| 'loading'
	| 'processing'
	| 'done'
	| 'error';

export interface PopupModel {
	readonly state: PopupState;
	readonly trackCount: number;
	readonly errorMessage: string | undefined;
	readonly skippedTrackCount?: number | undefined;
}

export function mapStatusToPopupState(
	status: PopupCollectionStatus,
): PopupState {
	switch (status) {
		case 'idle':
			return 'initial';
		case 'collecting':
			return 'processing';
		case 'done':
			return 'done';
		default:
			return 'error';
	}
}

export function initializingPopupModel(): PopupModel {
	return {
		state: 'initializing',
		trackCount: 0,
		errorMessage: undefined,
		skippedTrackCount: undefined,
	};
}

export function initialPopupModel(): PopupModel {
	return {
		state: 'initial',
		trackCount: 0,
		errorMessage: undefined,
		skippedTrackCount: undefined,
	};
}

export function processingPopupModel(): PopupModel {
	return {
		state: 'processing',
		trackCount: 0,
		errorMessage: undefined,
		skippedTrackCount: undefined,
	};
}

export function loadingPopupModel(): PopupModel {
	return {
		state: 'loading',
		trackCount: 0,
		errorMessage: undefined,
		skippedTrackCount: undefined,
	};
}
