import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Effect, Layer, ManagedRuntime } from 'effect';
import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
import type { GetStateResponse } from '@/common/model/request-message';

import { createPopupViewModel } from '@/popup/components/popup/view-model';
import type { PopupEnv } from '@/popup/runtime/popup-env';
import { silentLoggerLayer } from '@/test/effect-log-test';

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

const { getStateMock } = vi.hoisted(() => ({
	getStateMock: vi.fn<() => GetStateMockEffect>(() =>
		Effect.succeed({
			status: 'idle',
			trackCount: 0,
			errorMessage: undefined,
		}),
	),
}));

vi.mock('@/common/infrastructure/chrome-messaging', () => ({
	getState: getStateMock,
	sendToBackgroundEffect: () => Effect.succeed(undefined),
	decodeGetStateResponse: () =>
		Effect.succeed({
			status: 'idle',
			trackCount: 0,
			errorMessage: undefined,
		}),
	listenForStateUpdates: listenForStateUpdatesMock,
}));

const makeTestRuntime = () =>
	ManagedRuntime.make<PopupEnv, never>(Layer.mergeAll(silentLoggerLayer));

describe('Popup viewmodel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getStateMock.mockReset();
		getStateMock.mockImplementation(() =>
			Effect.succeed({
				status: 'idle',
				trackCount: 0,
				errorMessage: undefined,
			}),
		);
	});

	it('registers and tears down state update listener', () => {
		const vm = createPopupViewModel();

		expect(listenForStateUpdatesMock).toHaveBeenCalledTimes(1);
		vm.teardown();
		expect(stopListeningMock).toHaveBeenCalledTimes(1);
	});

	it('starts in initializing state before syncState', () => {
		const vm = createPopupViewModel();

		expect(vm.state()).toBe('initializing');
	});

	it('syncState sets initial state from background', async () => {
		const runtime = makeTestRuntime();
		const vm = createPopupViewModel();

		await runtime.runPromise(vm.effects.syncState);

		expect(vm.state()).toBe('initial');
		expect(vm.trackCount()).toBe(0);
		expect(vm.errorMessage()).toBeUndefined();
	});

	it('syncState sets login-required error when cookie is missing', async () => {
		getStateMock.mockImplementationOnce(() =>
			Effect.succeed({
				status: 'login-required',
				trackCount: 0,
				errorMessage: LOGIN_REQUIRED_MESSAGE,
			}),
		);
		const runtime = makeTestRuntime();
		const vm = createPopupViewModel();

		await runtime.runPromise(vm.effects.syncState);

		expect(vm.state()).toBe('login-required');
		expect(vm.errorMessage()).toBe(LOGIN_REQUIRED_MESSAGE);
	});

	it('retryAfterError re-runs getState when sync returned error (e.g. login required)', async () => {
		getStateMock
			.mockImplementationOnce(() =>
				Effect.succeed({
					status: 'login-required',
					trackCount: 0,
					errorMessage: LOGIN_REQUIRED_MESSAGE,
				}),
			)
			.mockImplementation(() =>
				Effect.succeed({
					status: 'error',
					trackCount: 0,
					errorMessage: 'Still need login.',
				}),
			);
		const runtime = makeTestRuntime();
		const vm = createPopupViewModel();

		await runtime.runPromise(vm.effects.syncState);
		expect(getStateMock).toHaveBeenCalledTimes(1);

		await runtime.runPromise(vm.effects.retryAfterError);

		expect(getStateMock).toHaveBeenCalledTimes(2);
		expect(vm.state()).toBe('error');
		expect(vm.errorMessage()).toBe('Still need login.');
	});

	it('syncState sets error when getState fails', async () => {
		getStateMock.mockImplementationOnce(() =>
			Effect.succeed({
				status: 'error',
				trackCount: 0,
				errorMessage: 'Could not reach the extension. Channel closed',
			}),
		);
		const runtime = makeTestRuntime();
		const vm = createPopupViewModel();

		await runtime.runPromise(vm.effects.syncState);

		expect(vm.state()).toBe('error');
		expect(vm.errorMessage()).toContain('Channel closed');
	});

	it('retryAfterError re-runs sync from initializing when sync failed', async () => {
		getStateMock
			.mockImplementationOnce(() =>
				Effect.succeed({
					status: 'error',
					trackCount: 0,
					errorMessage: 'Could not reach the extension. first failure',
				}),
			)
			.mockImplementation(() =>
				Effect.succeed({
					status: 'idle',
					trackCount: 0,
					errorMessage: undefined,
				}),
			);
		const runtime = makeTestRuntime();
		const vm = createPopupViewModel();

		await runtime.runPromise(vm.effects.syncState);
		expect(vm.state()).toBe('error');

		await runtime.runPromise(vm.effects.retryAfterError);

		expect(vm.state()).toBe('initial');
		expect(vm.errorMessage()).toBeUndefined();
	});

	it('startCollection moves to loading state', async () => {
		const runtime = makeTestRuntime();
		const vm = createPopupViewModel();

		await runtime.runPromise(vm.effects.startCollection);

		expect(vm.state()).toBe('loading');
		expect(vm.trackCount()).toBe(0);
	});

	it('loading transitions to checking-login then processing on collecting update', async () => {
		const runtime = makeTestRuntime();
		const vm = createPopupViewModel();

		await runtime.runPromise(vm.effects.startCollection);
		expect(vm.state()).toBe('loading');

		triggerStateUpdate({
			status: 'checking-login',
			trackCount: 0,
			errorMessage: undefined,
			skippedTrackCount: undefined,
		});

		expect(vm.state()).toBe('checking-login');
		expect(vm.trackCount()).toBe(0);

		triggerStateUpdate({
			status: 'collecting',
			trackCount: 3,
			errorMessage: undefined,
			skippedTrackCount: undefined,
		});

		expect(vm.state()).toBe('processing');
		expect(vm.trackCount()).toBe(3);
	});

	it('state update with status done maps to done state', async () => {
		const runtime = makeTestRuntime();
		const vm = createPopupViewModel();

		await runtime.runPromise(vm.effects.syncState);

		triggerStateUpdate({
			status: 'done',
			trackCount: 12,
			errorMessage: undefined,
			skippedTrackCount: undefined,
		});

		expect(vm.state()).toBe('done');
		expect(vm.trackCount()).toBe(12);
	});

	it('collecting update propagates skippedTrackCount', async () => {
		const runtime = makeTestRuntime();
		const vm = createPopupViewModel();

		await runtime.runPromise(vm.effects.syncState);

		triggerStateUpdate({
			status: 'collecting',
			trackCount: 5,
			errorMessage: undefined,
			skippedTrackCount: 2,
		});

		expect(vm.state()).toBe('processing');
		expect(vm.skippedTrackCount()).toBe(2);
	});
});
