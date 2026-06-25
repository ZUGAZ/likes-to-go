import type { Source } from '@/common/model/source';
import type { BeatState } from '@/mascot/model';

export type BeatPoseKey = 'idle' | 'working' | 'happy' | 'sad';
export type BeatActionId = 'start' | 'cancel' | 'download' | 'retry';

export interface BeatPersonaOption {
	readonly label: string;
	readonly actionId: BeatActionId;
}

export interface PersonaBalloonContext {
	readonly trackCount: number;
	readonly skippedTrackCount: number;
	readonly source: Source;
	readonly message: string | undefined;
}

export interface BeatPersonaEntry {
	readonly pose: BeatPoseKey;
	readonly balloonCopy: string | ((ctx: PersonaBalloonContext) => string);
	readonly options: ReadonlyArray<BeatPersonaOption>;
	readonly accessibilityLiveMessage?:
		| string
		| ((ctx: PersonaBalloonContext) => string | undefined);
	readonly footnoteCopy?:
		| string
		| ((ctx: PersonaBalloonContext) => string | undefined);
}

export const BEAT_LOGIN_REQUIRED_BALLOON_COPY =
	'Looks like your SoundCloud session expired. Please log in and try again.';

export const beatPersonaCatalog: Readonly<Record<BeatState, BeatPersonaEntry>> =
	{
		initializing: {
			pose: 'working',
			balloonCopy: 'One sec…',
			options: [],
			accessibilityLiveMessage: 'Loading.',
		},
		initial: {
			pose: 'idle',
			balloonCopy: (ctx: PersonaBalloonContext) =>
				ctx.source === 'active-soundcloud-tab'
					? "I'll grab your likes from this tab. Want to start?"
					: "I'm ready to save your likes. Want to start?",
			options: [{ label: 'Start export', actionId: 'start' }],
		},
		loading: {
			pose: 'working',
			balloonCopy: 'Starting your export…',
			options: [],
			accessibilityLiveMessage: 'Starting export.',
		},
		'checking-login': {
			pose: 'working',
			balloonCopy: 'Checking your SoundCloud login…',
			options: [{ label: 'Stop', actionId: 'cancel' }],
			accessibilityLiveMessage: 'Checking your SoundCloud login.',
		},
		processing: {
			pose: 'working',
			balloonCopy: (ctx: PersonaBalloonContext) =>
				`Gathering your likes… (${String(ctx.trackCount)} so far)`,
			options: [{ label: 'Stop', actionId: 'cancel' }],
			accessibilityLiveMessage: (ctx: PersonaBalloonContext) =>
				`Saving your likes. ${String(ctx.trackCount)} found.`,
			footnoteCopy: (ctx: PersonaBalloonContext) =>
				ctx.skippedTrackCount > 0
					? `Waiting on ${String(ctx.skippedTrackCount)}—give me a moment`
					: undefined,
		},
		paused: {
			pose: 'idle',
			balloonCopy: (ctx: PersonaBalloonContext) =>
				ctx.message ??
				`Paused here. You've got ${String(ctx.trackCount)} so far.`,
			options: [{ label: 'Stop', actionId: 'cancel' }],
		},
		done: {
			pose: 'happy',
			balloonCopy: (ctx: PersonaBalloonContext) =>
				`Done! Your ${String(ctx.trackCount)} tracks are ready to download.`,
			options: [{ label: 'Download backup', actionId: 'download' }],
			footnoteCopy: (ctx: PersonaBalloonContext) =>
				ctx.skippedTrackCount > 0
					? `Couldn't read ${String(ctx.skippedTrackCount)}; got the rest though.`
					: undefined,
		},
		'login-required': {
			pose: 'sad',
			balloonCopy: (ctx: PersonaBalloonContext) =>
				ctx.message ?? BEAT_LOGIN_REQUIRED_BALLOON_COPY,
			options: [{ label: 'Try again', actionId: 'retry' }],
		},
		error: {
			pose: 'sad',
			balloonCopy: (ctx: PersonaBalloonContext) =>
				ctx.message ?? 'Oops, something broke. Want me to try again?',
			options: [{ label: 'Try again', actionId: 'retry' }],
		},
	};

export function poseForState(state: BeatState): BeatPoseKey {
	return beatPersonaCatalog[state].pose;
}

export function resolveBalloonCopy(
	state: BeatState,
	context: PersonaBalloonContext,
): string {
	const { balloonCopy } = beatPersonaCatalog[state];
	return typeof balloonCopy === 'function' ? balloonCopy(context) : balloonCopy;
}

export function resolvePersonaOptions(
	state: BeatState,
): ReadonlyArray<BeatPersonaOption> {
	return beatPersonaCatalog[state].options;
}

export function resolveAccessibilityLiveMessage(
	state: BeatState,
	context: PersonaBalloonContext,
): string | undefined {
	const { accessibilityLiveMessage } = beatPersonaCatalog[state];
	if (accessibilityLiveMessage === undefined) return undefined;
	return typeof accessibilityLiveMessage === 'function'
		? accessibilityLiveMessage(context)
		: accessibilityLiveMessage;
}

export function resolveFootnoteCopy(
	state: BeatState,
	context: PersonaBalloonContext,
): string | undefined {
	const { footnoteCopy } = beatPersonaCatalog[state];
	if (footnoteCopy === undefined) return undefined;
	return typeof footnoteCopy === 'function'
		? footnoteCopy(context)
		: footnoteCopy;
}
