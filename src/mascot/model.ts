import type { CollectionStatus } from '@/common/model/request-message';
import type { Source } from '@/common/model/source';
import {
	poseForState,
	resolveBalloonCopy,
	resolveAccessibilityLiveMessage,
	resolveFootnoteCopy,
	resolvePersonaOptions,
	type BeatPoseKey,
	type BeatPersonaOption,
	type PersonaBalloonContext,
} from '@/mascot/persona';

export type BeatState =
	| 'initializing'
	| 'initial'
	| 'loading'
	| 'checking-login'
	| 'processing'
	| 'paused'
	| 'done'
	| 'login-required'
	| 'error';

export type BeatSource = Source;

export interface BeatModel {
	readonly state: BeatState;
	readonly trackCount: number;
	readonly message: string | undefined;
	readonly skippedTrackCount?: number | undefined;
	readonly source: BeatSource;
}

// BeatCopyContext is identical to PersonaBalloonContext — re-exported for consumers
// that should not depend on persona.ts directly.
export type BeatCopyContext = PersonaBalloonContext;

export function mapStatusToBeatState(status: CollectionStatus): BeatState {
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

export function mapStateToBusy(state: BeatState): boolean {
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

// Thin wrappers that delegate copy/pose resolution to persona.ts.
// Model consumers call these instead of importing persona directly,
// keeping the dependency direction clean.

export function mapStateToPose(state: BeatState): BeatPoseKey {
	return poseForState(state);
}

export function mapStateToBalloonCopy(
	state: BeatState,
	ctx: BeatCopyContext,
): string {
	return resolveBalloonCopy(state, ctx);
}

export function mapStateToOptions(
	state: BeatState,
): ReadonlyArray<BeatPersonaOption> {
	return resolvePersonaOptions(state);
}

export function mapStateToLiveMessage(
	state: BeatState,
	ctx: BeatCopyContext,
): string | undefined {
	return resolveAccessibilityLiveMessage(state, ctx);
}

export function mapStateToFootnote(
	state: BeatState,
	ctx: BeatCopyContext,
): string | undefined {
	return resolveFootnoteCopy(state, ctx);
}

export function initializingBeatModel(): BeatModel {
	return {
		state: 'initializing',
		trackCount: 0,
		message: undefined,
		skippedTrackCount: undefined,
		source: 'likes-page',
	};
}

export function initialBeatModel(): BeatModel {
	return {
		state: 'initial',
		trackCount: 0,
		message: undefined,
		skippedTrackCount: undefined,
		source: 'likes-page',
	};
}

export function loadingBeatModel(): BeatModel {
	return {
		state: 'loading',
		trackCount: 0,
		message: undefined,
		skippedTrackCount: undefined,
		source: 'likes-page',
	};
}
