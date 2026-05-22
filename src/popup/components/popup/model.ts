import type { CollectionStatus, Source } from '@/common/model/request-message';

export type PopupState =
	| 'initializing'
	| 'initial'
	| 'loading'
	| 'checking-login'
	| 'processing'
	| 'done'
	| 'login-required'
	| 'error';

export type PopupSource = Source;

export interface PopupModel {
	readonly state: PopupState;
	readonly trackCount: number;
	readonly errorMessage: string | undefined;
	readonly skippedTrackCount?: number | undefined;
	readonly source: PopupSource;
}

export function mapStatusToPopupState(status: CollectionStatus): PopupState {
	switch (status) {
		case 'idle':
			return 'initial';
		case 'checking-login':
			return 'checking-login';
		case 'collecting':
			return 'processing';
		case 'done':
			return 'done';
		case 'login-required':
			return 'login-required';
		case 'error':
			return 'error';
	}
}

export function initializingPopupModel(): PopupModel {
	return {
		state: 'initializing',
		trackCount: 0,
		errorMessage: undefined,
		skippedTrackCount: undefined,
		source: 'likes-page',
	};
}

export function initialPopupModel(): PopupModel {
	return {
		state: 'initial',
		trackCount: 0,
		errorMessage: undefined,
		skippedTrackCount: undefined,
		source: 'likes-page',
	};
}

export function processingPopupModel(): PopupModel {
	return {
		state: 'processing',
		trackCount: 0,
		errorMessage: undefined,
		skippedTrackCount: undefined,
		source: 'likes-page',
	};
}

export function loadingPopupModel(): PopupModel {
	return {
		state: 'loading',
		trackCount: 0,
		errorMessage: undefined,
		skippedTrackCount: undefined,
		source: 'likes-page',
	};
}
