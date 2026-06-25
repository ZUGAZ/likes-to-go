import { describe, expect, it } from 'vitest';
import {
	BEAT_LOGIN_REQUIRED_BALLOON_COPY,
	beatPersonaCatalog,
	poseForState,
	resolveBalloonCopy,
	resolveAccessibilityLiveMessage,
	resolveFootnoteCopy,
	resolvePersonaOptions,
	type BeatActionId,
	type BeatPoseKey,
	type PersonaBalloonContext,
} from '@/mascot/persona';
import type { PopupState } from '@/popup/components/popup/model';

const ALL_STATES: ReadonlyArray<PopupState> = [
	'initializing',
	'initial',
	'loading',
	'checking-login',
	'processing',
	'paused',
	'done',
	'login-required',
	'error',
];

const VALID_POSES = new Set<BeatPoseKey>(['idle', 'working', 'happy', 'sad']);
const VALID_ACTION_IDS = new Set<BeatActionId>([
	'start',
	'cancel',
	'download',
	'retry',
]);

const FORBIDDEN_VOCABULARY =
	/\b(scrape|scraping|harvest|harvesting|crawl|crawling|bot|mine|mining|extract|extracting)\b/i;

const baseContext: PersonaBalloonContext = {
	trackCount: 5,
	skippedTrackCount: 0,
	source: 'likes-page',
	message: undefined,
};

const contextWithSkipped: PersonaBalloonContext = {
	...baseContext,
	skippedTrackCount: 2,
};

const contextWithMessage: PersonaBalloonContext = {
	...baseContext,
	message: 'Custom error from background.',
};

const contextActiveTab: PersonaBalloonContext = {
	...baseContext,
	source: 'active-soundcloud-tab',
};

describe('beatPersonaCatalog exhaustiveness', () => {
	it('has exactly one entry per PopupState', () => {
		const catalogKeys = Object.keys(
			beatPersonaCatalog,
		) as ReadonlyArray<PopupState>;
		expect(catalogKeys).toHaveLength(ALL_STATES.length);
		for (const state of ALL_STATES) {
			expect(beatPersonaCatalog).toHaveProperty(state);
		}
	});

	it('poseForState returns a valid BeatPoseKey for every state', () => {
		for (const state of ALL_STATES) {
			const pose = poseForState(state);
			expect(VALID_POSES.has(pose), `${state} pose "${pose}" not valid`).toBe(
				true,
			);
		}
	});

	it('pose mapping matches task spec', () => {
		expect(poseForState('initializing')).toBe('working');
		expect(poseForState('initial')).toBe('idle');
		expect(poseForState('loading')).toBe('working');
		expect(poseForState('checking-login')).toBe('working');
		expect(poseForState('processing')).toBe('working');
		expect(poseForState('paused')).toBe('idle');
		expect(poseForState('done')).toBe('happy');
		expect(poseForState('login-required')).toBe('sad');
		expect(poseForState('error')).toBe('sad');
	});
});

describe('options validity', () => {
	it('all actionIds are in the allowed set', () => {
		for (const state of ALL_STATES) {
			const options = resolvePersonaOptions(state);
			for (const option of options) {
				expect(
					VALID_ACTION_IDS.has(option.actionId),
					`${state} option actionId "${option.actionId}" not valid`,
				).toBe(true);
			}
		}
	});

	it('all button labels are non-empty strings', () => {
		for (const state of ALL_STATES) {
			const options = resolvePersonaOptions(state);
			for (const option of options) {
				expect(option.label.length > 0, `${state} option label is empty`).toBe(
					true,
				);
			}
		}
	});

	it('initial state has a start action', () => {
		const options = resolvePersonaOptions('initial');
		expect(options).toHaveLength(1);
		expect(options[0]?.actionId).toBe('start');
	});

	it('done state has a download action', () => {
		const options = resolvePersonaOptions('done');
		expect(options).toHaveLength(1);
		expect(options[0]?.actionId).toBe('download');
	});

	it('error and login-required states have a retry action', () => {
		for (const state of ['error', 'login-required'] as const) {
			const options = resolvePersonaOptions(state);
			expect(options).toHaveLength(1);
			expect(options[0]?.actionId).toBe('retry');
		}
	});

	it('busy progress states have a cancel action', () => {
		for (const state of ['checking-login', 'processing', 'paused'] as const) {
			const options = resolvePersonaOptions(state);
			expect(options).toHaveLength(1);
			expect(options[0]?.actionId).toBe('cancel');
		}
	});
});

describe('resolver spot-checks', () => {
	it('resolveBalloonCopy initial with likes-page source', () => {
		const copy = resolveBalloonCopy('initial', baseContext);
		expect(typeof copy).toBe('string');
		expect(copy.length).toBeGreaterThan(0);
	});

	it('resolveBalloonCopy initial with active-soundcloud-tab source returns tab-specific copy', () => {
		const copy = resolveBalloonCopy('initial', contextActiveTab);
		const defaultCopy = resolveBalloonCopy('initial', baseContext);
		expect(copy).not.toBe(defaultCopy);
		expect(copy).toContain('this tab');
	});

	it('resolveBalloonCopy processing includes track count', () => {
		const copy = resolveBalloonCopy('processing', {
			...baseContext,
			trackCount: 3,
		});
		expect(copy).toContain('3');
	});

	it('resolveBalloonCopy done includes track count', () => {
		const copy = resolveBalloonCopy('done', { ...baseContext, trackCount: 47 });
		expect(copy).toContain('47');
	});

	it('resolveBalloonCopy error/login-required prefers context.message when set', () => {
		for (const state of ['error', 'login-required'] as const) {
			const copy = resolveBalloonCopy(state, contextWithMessage);
			expect(copy).toBe('Custom error from background.');
		}
	});

	it('resolveBalloonCopy paused prefers context.message when set', () => {
		const copy = resolveBalloonCopy('paused', contextWithMessage);
		expect(copy).toBe('Custom error from background.');
	});

	it('resolveBalloonCopy error falls back to catalog when message is undefined', () => {
		const copy = resolveBalloonCopy('error', baseContext);
		expect(copy.length).toBeGreaterThan(0);
		expect(copy).not.toBe('Custom error from background.');
	});

	it('resolveAccessibilityLiveMessage is defined for busy states', () => {
		const busyStates: ReadonlyArray<PopupState> = [
			'initializing',
			'loading',
			'checking-login',
			'processing',
		];
		for (const state of busyStates) {
			const msg = resolveAccessibilityLiveMessage(state, baseContext);
			expect(
				typeof msg === 'string' && msg.length > 0,
				`${state} live message should be defined`,
			).toBe(true);
		}
	});

	it('resolveAccessibilityLiveMessage is undefined for non-busy states', () => {
		const nonBusyStates: ReadonlyArray<PopupState> = [
			'initial',
			'done',
			'login-required',
			'error',
		];
		for (const state of nonBusyStates) {
			const msg = resolveAccessibilityLiveMessage(state, baseContext);
			expect(msg).toBeUndefined();
		}
	});

	it('resolveFootnoteCopy processing returns undefined when skippedTrackCount is 0', () => {
		const footnote = resolveFootnoteCopy('processing', baseContext);
		expect(footnote).toBeUndefined();
	});

	it('resolveFootnoteCopy processing returns string when skippedTrackCount > 0', () => {
		const footnote = resolveFootnoteCopy('processing', contextWithSkipped);
		expect(typeof footnote).toBe('string');
		expect(footnote).toContain('2');
	});

	it('resolveFootnoteCopy done returns undefined when skippedTrackCount is 0', () => {
		const footnote = resolveFootnoteCopy('done', baseContext);
		expect(footnote).toBeUndefined();
	});

	it('resolveFootnoteCopy done returns string when skippedTrackCount > 0', () => {
		const footnote = resolveFootnoteCopy('done', contextWithSkipped);
		expect(typeof footnote).toBe('string');
		expect(footnote).toContain('2');
	});

	it('BEAT_LOGIN_REQUIRED_BALLOON_COPY is used as fallback for login-required', () => {
		const copy = resolveBalloonCopy('login-required', baseContext);
		expect(copy).toBe(BEAT_LOGIN_REQUIRED_BALLOON_COPY);
	});
});

describe('Public Language vocabulary', () => {
	function gatherAllText(): ReadonlyArray<string> {
		const texts: string[] = [BEAT_LOGIN_REQUIRED_BALLOON_COPY];

		const contexts: ReadonlyArray<PersonaBalloonContext> = [
			baseContext,
			contextWithSkipped,
			contextActiveTab,
		];

		for (const state of ALL_STATES) {
			for (const ctx of contexts) {
				const balloon = resolveBalloonCopy(state, ctx);
				texts.push(balloon);

				const liveMsg = resolveAccessibilityLiveMessage(state, ctx);
				if (liveMsg !== undefined) texts.push(liveMsg);

				const footnote = resolveFootnoteCopy(state, ctx);
				if (footnote !== undefined) texts.push(footnote);
			}

			const options = resolvePersonaOptions(state);
			for (const option of options) {
				texts.push(option.label);
			}
		}

		return texts;
	}

	it('no text contains forbidden vocabulary', () => {
		const allText = gatherAllText();
		for (const text of allText) {
			expect(
				FORBIDDEN_VOCABULARY.test(text),
				`Forbidden word found in: "${text}"`,
			).toBe(false);
		}
	});
});
