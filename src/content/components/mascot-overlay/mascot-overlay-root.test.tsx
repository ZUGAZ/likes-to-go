import { Effect, Layer, ManagedRuntime, Runtime } from 'effect';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render } from '@solidjs/testing-library';

vi.mock('solid-transition-group', () => ({
	Transition: (props: { children: import('solid-js').JSX.Element }) => (
		<>{props.children}</>
	),
}));

const { listenForStateUpdatesMock } = vi.hoisted(() => {
	const stopListening = vi.fn();
	const listenForStateUpdates = vi.fn(
		(callback: (payload: unknown) => void) => {
			void callback;
			return stopListening;
		},
	);
	return { listenForStateUpdatesMock: listenForStateUpdates };
});

const { getStateMock, sendToBackgroundMock } = vi.hoisted(() => ({
	getStateMock: vi.fn(() =>
		Effect.succeed({
			status: 'idle',
			trackCount: 0,
			message: undefined,
		}),
	),
	sendToBackgroundMock: vi.fn(() => Effect.succeed(undefined)),
}));

const { getResolvedPopupThemeMock } = vi.hoisted(() => ({
	getResolvedPopupThemeMock: vi.fn(() => Effect.succeed('light' as const)),
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

import { MascotOverlayRoot } from '@/content/components/mascot-overlay/mascot-overlay-root';
import { createMascotVisibility } from '@/mascot/visibility';
import { silentLoggerLayer } from '@/test/effect-log-test';

const unmountFns: Array<() => void> = [];

afterEach(() => {
	while (unmountFns.length > 0) {
		unmountFns.pop()?.();
	}
});

describe('MascotOverlayRoot', () => {
	let runtime: Runtime.Runtime<never>;

	beforeAll(async () => {
		const managed = ManagedRuntime.make(Layer.mergeAll(silentLoggerLayer));
		runtime = await managed.runtime();
	});

	it('sets aria-hidden and pointer-events on shadow host from visibility', () => {
		const shadowHost = document.createElement('div');
		const visibility = createMascotVisibility(false);
		const resolvePoseUrl = vi.fn(() => 'mascot://idle');

		const view = render(() => (
			<MascotOverlayRoot
				runtime={runtime}
				visibility={visibility}
				shadowHost={shadowHost}
				resolvePoseUrl={resolvePoseUrl}
			/>
		));
		unmountFns.push(view.unmount);

		expect(shadowHost.getAttribute('aria-hidden')).toBe('true');
		expect(shadowHost.style.pointerEvents).toBe('none');
		expect(document.querySelector('.beat-root')).toBeNull();

		visibility.summon();

		expect(shadowHost.getAttribute('aria-hidden')).toBe('false');
		expect(shadowHost.style.pointerEvents).toBe('auto');
		expect(view.getByRole('heading', { name: 'Likes to Go' })).toBeTruthy();
	});
});
