import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Effect, Layer, ManagedRuntime } from 'effect';
import { COLLECTION_SOURCE_INVALIDATED_MESSAGE } from '@/common/model/collection/events/collection-source-invalidated';
import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
import type { GetStateResponse } from '@/common/model/request-message';
import type { ResolvedPopupTheme } from '@/common/model/soundcloud-theme';
import { silentLoggerLayer } from '@/test/effect-log-test';

import { createMascotViewModel } from '@/mascot/view-model';
import { resolveBundledPoseUrl } from '@/mascot/pose-assets';
import { createMascotVisibility } from '@/mascot/visibility';
import type { BeatPoseKey } from '@/mascot/persona';
import {
	poseForState,
	resolveBalloonCopy,
	resolvePersonaOptions,
	resolveAccessibilityLiveMessage,
} from '@/mascot/persona';

const { stopListeningMock, listenForStateUpdatesMock, triggerStateUpdate } =
	vi.hoisted(() => {
		const stopListening = vi.fn();
		let onStateUpdate: ((payload: unknown) => void) | undefined;

		const listenForStateUpdates = vi.fn(
			(callback: (payload: unknown) => void) => {
				onStateUpdate = callback;
				return stopListening;
			},
		);

		const triggerStateUpdate = (payload: unknown): void => {
			if (onStateUpdate == null) {
				return;
			}
			onStateUpdate(payload);
		};
		return {
			stopListeningMock: stopListening,
			listenForStateUpdatesMock: listenForStateUpdates,
			triggerStateUpdate,
		};
	});

type GetStateMockEffect = Effect.Effect<GetStateResponse>;

const { getStateMock, sendToBackgroundMock } = vi.hoisted(() => ({
	getStateMock: vi.fn<() => GetStateMockEffect>(() =>
		Effect.succeed({
			status: 'idle',
			trackCount: 0,
			message: undefined,
		}),
	),
	sendToBackgroundMock: vi.fn<
		(message: { readonly _tag: string }) => Effect.Effect<void>
	>(() => Effect.succeed(undefined)),
}));

const { getResolvedPopupThemeMock } = vi.hoisted(() => ({
	getResolvedPopupThemeMock: vi.fn<() => Effect.Effect<ResolvedPopupTheme>>(
		() => Effect.succeed('light'),
	),
}));

vi.mock('@/common/infrastructure/chrome-messaging', () => ({
	getState: getStateMock,
	sendToBackgroundEffect: sendToBackgroundMock,
	decodeGetStateResponse: () =>
		Effect.succeed({
			status: 'idle',
			trackCount: 0,
			message: undefined,
		}),
}));

vi.mock('@/common/infrastructure/listen-for-state-updates', () => ({
	listenForStateUpdatesEffect: vi.fn((callback: (payload: unknown) => void) =>
		Effect.sync(() => listenForStateUpdatesMock(callback)),
	),
}));

vi.mock('@/common/infrastructure/get-resolved-popup-theme', () => ({
	getResolvedPopupThemeEffect: getResolvedPopupThemeMock,
}));

const makeTestRuntime = () =>
	ManagedRuntime.make<never, never>(Layer.mergeAll(silentLoggerLayer));

function makeVm(initiallyVisible = true) {
	const visibility = createMascotVisibility(initiallyVisible);
	const vm = createMascotViewModel({
		visibility,
		resolvePoseUrl: resolveBundledPoseUrl,
	});
	return { vm, visibility };
}

describe('MascotViewModel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getStateMock.mockReset();
		sendToBackgroundMock.mockReset();
		sendToBackgroundMock.mockImplementation(() => Effect.succeed(undefined));
		getResolvedPopupThemeMock.mockReset();
		getResolvedPopupThemeMock.mockImplementation(() => Effect.succeed('light'));
		getStateMock.mockImplementation(() =>
			Effect.succeed({
				status: 'idle',
				trackCount: 0,
				message: undefined,
			}),
		);
	});

	it('registers and tears down state update listener', () => {
		const { vm } = makeVm();

		expect(listenForStateUpdatesMock).toHaveBeenCalledTimes(1);
		vm.teardown();
		expect(stopListeningMock).toHaveBeenCalledTimes(1);
	});

	it('starts in initializing state before syncState', () => {
		const { vm } = makeVm();

		expect(vm.state()).toBe('initializing');
		expect(vm.theme()).toBe('light');
		expect(vm.source()).toBe('likes-page');
		expect(vm.isStatusBusy()).toBe(true);
	});

	it('persona accessor pose updates with state', () => {
		const { vm } = makeVm();

		expect(vm.pose()).toBe(poseForState('initializing'));
	});

	it('persona accessor balloonCopy updates with state', () => {
		const { vm } = makeVm();

		const expectedCopy = resolveBalloonCopy('initializing', {
			trackCount: 0,
			skippedTrackCount: 0,
			source: 'likes-page',
			message: undefined,
		});
		expect(vm.balloonCopy()).toBe(expectedCopy);
	});

	it('persona accessor options updates with state', () => {
		const { vm } = makeVm();

		expect(vm.options()).toEqual(resolvePersonaOptions('initializing'));
	});

	it('syncState sets initial state from background', async () => {
		const runtime = makeTestRuntime();
		const { vm } = makeVm();

		await runtime.runPromise(vm.effects.syncState);

		expect(vm.state()).toBe('initial');
		expect(vm.trackCount()).toBe(0);
		expect(vm.message()).toBeUndefined();
		expect(vm.source()).toBe('likes-page');
	});

	it('persona accessors reflect new state after syncState', async () => {
		const runtime = makeTestRuntime();
		const { vm } = makeVm();

		await runtime.runPromise(vm.effects.syncState);

		expect(vm.pose()).toBe(poseForState('initial'));
		expect(vm.options()).toEqual(resolvePersonaOptions('initial'));
		const expectedCopy = resolveBalloonCopy('initial', {
			trackCount: 0,
			skippedTrackCount: 0,
			source: 'likes-page',
			message: undefined,
		});
		expect(vm.balloonCopy()).toBe(expectedCopy);
	});

	it('liveStatusMessage returns persona accessibility message for busy state', () => {
		const { vm } = makeVm();

		const expectedMsg = resolveAccessibilityLiveMessage('initializing', {
			trackCount: 0,
			skippedTrackCount: 0,
			source: 'likes-page',
			message: undefined,
		});
		expect(vm.liveStatusMessage()).toBe(expectedMsg);
	});

	it('liveStatusMessage is undefined for non-busy state', async () => {
		const runtime = makeTestRuntime();
		const { vm } = makeVm();

		await runtime.runPromise(vm.effects.syncState);

		expect(vm.state()).toBe('initial');
		expect(vm.liveStatusMessage()).toBeUndefined();
	});

	it('syncState updates resolved theme', async () => {
		getResolvedPopupThemeMock.mockImplementationOnce(() =>
			Effect.succeed('dark'),
		);
		const runtime = makeTestRuntime();
		const { vm } = makeVm();

		await runtime.runPromise(vm.effects.syncState);

		expect(vm.theme()).toBe('dark');
		expect(getResolvedPopupThemeMock).toHaveBeenCalledTimes(1);
	});

	it('syncState updates source from background', async () => {
		getStateMock.mockImplementationOnce(() =>
			Effect.succeed({
				status: 'idle',
				trackCount: 0,
				message: undefined,
				source: 'active-soundcloud-tab',
			}),
		);
		const runtime = makeTestRuntime();
		const { vm } = makeVm();

		await runtime.runPromise(vm.effects.syncState);

		expect(vm.state()).toBe('initial');
		expect(vm.source()).toBe('active-soundcloud-tab');
	});

	it('syncState sets login-required when cookie is missing', async () => {
		getStateMock.mockImplementationOnce(() =>
			Effect.succeed({
				status: 'login-required',
				trackCount: 0,
				message: LOGIN_REQUIRED_MESSAGE,
			}),
		);
		const runtime = makeTestRuntime();
		const { vm } = makeVm();

		await runtime.runPromise(vm.effects.syncState);

		expect(vm.state()).toBe('login-required');
		expect(vm.message()).toBe(LOGIN_REQUIRED_MESSAGE);
	});

	it('retryAfterError re-runs getState when sync returned login-required', async () => {
		getStateMock
			.mockImplementationOnce(() =>
				Effect.succeed({
					status: 'login-required',
					trackCount: 0,
					message: LOGIN_REQUIRED_MESSAGE,
				}),
			)
			.mockImplementation(() =>
				Effect.succeed({
					status: 'error',
					trackCount: 0,
					message: 'Still need login.',
				}),
			);
		const runtime = makeTestRuntime();
		const { vm } = makeVm();
		sendToBackgroundMock.mockClear();

		await runtime.runPromise(vm.effects.syncState);
		expect(getStateMock).toHaveBeenCalledTimes(1);

		await runtime.runPromise(vm.effects.retryAfterError);

		expect(sendToBackgroundMock).not.toHaveBeenCalled();
		expect(getStateMock).toHaveBeenCalledTimes(2);
		expect(vm.state()).toBe('error');
		expect(vm.message()).toBe('Still need login.');
	});

	it('retryAfterError dismisses generic error before re-syncing', async () => {
		getStateMock
			.mockImplementationOnce(() =>
				Effect.succeed({
					status: 'error',
					trackCount: 0,
					message: COLLECTION_SOURCE_INVALIDATED_MESSAGE,
				}),
			)
			.mockImplementationOnce(() =>
				Effect.succeed({
					status: 'idle',
					trackCount: 0,
					source: 'active-soundcloud-tab',
				}),
			);
		const runtime = makeTestRuntime();
		const { vm } = makeVm();
		sendToBackgroundMock.mockClear();

		await runtime.runPromise(vm.effects.syncState);
		await runtime.runPromise(vm.effects.retryAfterError);

		expect(
			sendToBackgroundMock.mock.calls.some(
				([message]) => message._tag === 'CancelCollection',
			),
		).toBe(true);
		expect(sendToBackgroundMock).toHaveBeenCalledTimes(1);
		expect(vm.state()).toBe('initial');
		expect(vm.source()).toBe('active-soundcloud-tab');
	});

	it('startCollection moves to loading state', async () => {
		const runtime = makeTestRuntime();
		const { vm } = makeVm();

		await runtime.runPromise(vm.effects.startCollection);

		expect(vm.state()).toBe('loading');
		expect(vm.trackCount()).toBe(0);
	});

	it('state update listener sets processing state', async () => {
		const runtime = makeTestRuntime();
		const { vm } = makeVm();

		await runtime.runPromise(vm.effects.startCollection);
		expect(vm.state()).toBe('loading');

		triggerStateUpdate({
			status: 'collecting',
			trackCount: 3,
			message: undefined,
			skippedTrackCount: undefined,
		});

		expect(vm.state()).toBe('processing');
		expect(vm.trackCount()).toBe(3);
		expect(vm.isStatusBusy()).toBe(true);
	});

	it('collecting update propagates skippedTrackCount', async () => {
		const runtime = makeTestRuntime();
		const { vm } = makeVm();

		await runtime.runPromise(vm.effects.syncState);

		triggerStateUpdate({
			status: 'collecting',
			trackCount: 5,
			message: undefined,
			skippedTrackCount: 2,
		});

		expect(vm.state()).toBe('processing');
		expect(vm.skippedTrackCount()).toBe(2);
	});

	it('state update done maps to done state', async () => {
		const runtime = makeTestRuntime();
		const { vm } = makeVm();

		await runtime.runPromise(vm.effects.syncState);

		triggerStateUpdate({
			status: 'done',
			trackCount: 12,
			message: undefined,
			skippedTrackCount: undefined,
		});

		expect(vm.state()).toBe('done');
		expect(vm.trackCount()).toBe(12);
	});

	it('paused update applies message', async () => {
		const runtime = makeTestRuntime();
		const { vm } = makeVm();

		await runtime.runPromise(vm.effects.syncState);

		triggerStateUpdate({
			status: 'paused',
			trackCount: 5,
			message:
				'Collection paused — SoundCloud tab is hidden. Please focus it to resume.',
			skippedTrackCount: undefined,
		});

		expect(vm.state()).toBe('paused');
		expect(vm.message()).toBe(
			'Collection paused — SoundCloud tab is hidden. Please focus it to resume.',
		);
	});
});

describe('MascotViewModel — visibility', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getStateMock.mockImplementation(() =>
			Effect.succeed({ status: 'idle', trackCount: 0, message: undefined }),
		);
		sendToBackgroundMock.mockImplementation(() => Effect.succeed(undefined));
		getResolvedPopupThemeMock.mockImplementation(() => Effect.succeed('light'));
	});

	it('overlay starts hidden when initiallyVisible=false', () => {
		const { vm } = makeVm(false);

		expect(vm.isVisible()).toBe(false);
	});

	it('popup starts visible when initiallyVisible=true', () => {
		const { vm } = makeVm(true);

		expect(vm.isVisible()).toBe(true);
	});

	it('summon() makes the mascot visible', () => {
		const { vm, visibility } = makeVm(false);

		expect(vm.isVisible()).toBe(false);
		visibility.summon();
		expect(vm.isVisible()).toBe(true);
	});

	it('dismiss() hides the mascot', () => {
		const { vm, visibility } = makeVm(true);

		expect(vm.isVisible()).toBe(true);
		visibility.dismiss();
		expect(vm.isVisible()).toBe(false);
	});

	it('toggle() flips visibility', () => {
		const { vm, visibility } = makeVm(false);

		expect(vm.isVisible()).toBe(false);
		visibility.toggle();
		expect(vm.isVisible()).toBe(true);
		visibility.toggle();
		expect(vm.isVisible()).toBe(false);
	});
});

describe('MascotViewModel — poseUrl', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getStateMock.mockImplementation(() =>
			Effect.succeed({ status: 'idle', trackCount: 0, message: undefined }),
		);
		sendToBackgroundMock.mockImplementation(() => Effect.succeed(undefined));
		getResolvedPopupThemeMock.mockImplementation(() => Effect.succeed('light'));
	});

	it('resolves pose URL via resolvePoseUrl', () => {
		const { vm } = makeVm();

		expect(vm.poseUrl()).toMatch(/\.png$/);
	});

	it('uses custom resolvePoseUrl when provided', () => {
		const customResolver = vi.fn((pose: BeatPoseKey) => `custom://${pose}`);
		const visibility = createMascotVisibility(true);
		const vm = createMascotViewModel({
			visibility,
			resolvePoseUrl: customResolver,
		});

		expect(vm.poseUrl()).toBe(`custom://${vm.pose()}`);
		expect(customResolver).toHaveBeenCalledWith(vm.pose());
	});
});

describe('MascotViewModel — handleAction', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getStateMock.mockImplementation(() =>
			Effect.succeed({ status: 'idle', trackCount: 0, message: undefined }),
		);
		sendToBackgroundMock.mockImplementation(() => Effect.succeed(undefined));
		getResolvedPopupThemeMock.mockImplementation(() => Effect.succeed('light'));
	});

	it('routes each actionId to the matching effect', () => {
		const { vm } = makeVm();

		expect(vm.effects.handleAction('start')).toBe(vm.effects.startCollection);
		expect(vm.effects.handleAction('cancel')).toBe(vm.effects.cancelCollection);
		expect(vm.effects.handleAction('download')).toBe(vm.effects.download);
		expect(vm.effects.handleAction('retry')).toBe(vm.effects.retryAfterError);
	});
});
