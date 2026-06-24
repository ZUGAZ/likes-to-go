import type { CollectionStatus, Source } from '@/common/model/request-message';

export type PopupState =
	| 'initializing'
	| 'initial'
	| 'loading'
	| 'checking-login'
	| 'processing'
	| 'paused'
	| 'done'
	| 'login-required'
	| 'error';

export type PopupSource = Source;

export interface PopupModel {
	readonly state: PopupState;
	readonly trackCount: number;
	readonly message: string | undefined;
	readonly skippedTrackCount?: number | undefined;
	readonly source: PopupSource;
}

export function mapSourceToCopy(source: PopupSource): string {
	switch (source) {
		case 'active-soundcloud-tab':
			return 'Will collect from current SoundCloud tab';
		case 'likes-page':
			return 'Will open your likes page';
	}
}

export function mapStateToBusy(state: PopupState): boolean {
	switch (state) {
		case 'initializing':
		case 'loading':
		case 'checking-login':
		case 'processing':
			return true;
		case 'initial':
		case 'paused':
		case 'done':
		case 'login-required':
		case 'error':
			return false;
	}
}

export function mapStateToLiveStatusMessage(
	state: PopupState,
	trackCount: number,
): string | undefined {
	const readableTrackCount = String(trackCount);

	switch (state) {
		case 'initializing':
			return 'Loading.';
		case 'loading':
			return 'Starting export.';
		case 'checking-login':
			return 'Checking login status.';
		case 'processing':
			return `Collecting likes. ${readableTrackCount} found.`;
		case 'paused':
			return `Paused. ${readableTrackCount} likes collected so far.`;
		case 'done':
			return `Export ready. ${readableTrackCount} tracks collected.`;
		case 'initial':
		case 'login-required':
		case 'error':
			return undefined;
	}
}

export function mapStatusToPopupState(status: CollectionStatus): PopupState {
	switch (status) {
		case 'idle':
			return 'initial';
		case 'checking-login':
			return 'checking-login';
		case 'collecting':
			return 'processing';
		case 'paused':
			return 'paused';
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
		message: undefined,
		skippedTrackCount: undefined,
		source: 'likes-page',
	};
}

export function initialPopupModel(): PopupModel {
	return {
		state: 'initial',
		trackCount: 0,
		message: undefined,
		skippedTrackCount: undefined,
		source: 'likes-page',
	};
}

export function processingPopupModel(): PopupModel {
	return {
		state: 'processing',
		trackCount: 0,
		message: undefined,
		skippedTrackCount: undefined,
		source: 'likes-page',
	};
}

export function loadingPopupModel(): PopupModel {
	return {
		state: 'loading',
		trackCount: 0,
		message: undefined,
		skippedTrackCount: undefined,
		source: 'likes-page',
	};
}
