import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Effect, Layer, ManagedRuntime } from 'effect';

import { createPopupViewModel } from '@/popup/components/popup/view-model';
import type { PopupEnv } from '@/popup/runtime/popup-env';
import { HeartLoggerLive } from '@/common/infrastructure/logger';

const { stopListeningMock, listenForStateUpdatesMock } = vi.hoisted(() => {
	const stopListening = vi.fn();
	const listenForStateUpdates = vi.fn(() => stopListening);
	return {
		stopListeningMock: stopListening,
		listenForStateUpdatesMock: listenForStateUpdates,
	};
});

vi.mock('@/common/infrastructure/chrome-messaging', () => ({
	getState: () =>
		Effect.succeed({
			status: 'idle',
			trackCount: 0,
			errorMessage: undefined,
		}),
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
	ManagedRuntime.make<PopupEnv, never>(Layer.mergeAll(HeartLoggerLive));

describe('Popup viewmodel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('registers and tears down state update listener', () => {
		const vm = createPopupViewModel();

		expect(listenForStateUpdatesMock).toHaveBeenCalledTimes(1);
		vm.teardown();
		expect(stopListeningMock).toHaveBeenCalledTimes(1);
	});

	it('syncState sets initial state from background', async () => {
		const runtime = makeTestRuntime();
		const vm = createPopupViewModel();

		await runtime.runPromise(vm.effects.syncState);

		expect(vm.state()).toBe('initial');
		expect(vm.trackCount()).toBe(0);
		expect(vm.errorMessage()).toBeUndefined();
	});

	it('startCollection moves to processing state', async () => {
		const runtime = makeTestRuntime();
		const vm = createPopupViewModel();

		await runtime.runPromise(vm.effects.startCollection);

		expect(vm.state()).toBe('processing');
		expect(vm.trackCount()).toBe(0);
	});
});
