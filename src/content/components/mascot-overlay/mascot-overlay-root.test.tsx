import { Effect, Layer, ManagedRuntime, Runtime } from 'effect';
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import { render } from '@solidjs/testing-library';

vi.mock('solid-transition-group', () => ({
	Transition: (props: { children: import('solid-js').JSX.Element }) => (
		<>{props.children}</>
	),
}));

const { getResolvedPopupThemeMock } = vi.hoisted(() => ({
	getResolvedPopupThemeMock: vi.fn(() => Effect.succeed('light' as const)),
}));

vi.mock('@/common/infrastructure/get-resolved-popup-theme', () => ({
	getResolvedPopupThemeEffect: getResolvedPopupThemeMock,
}));

import { MascotOverlayRoot } from '@/content/components/mascot-overlay/mascot-overlay-root';
import type { CollectionBackendTag } from '@/mascot/collection-backend';
import { createMascotVisibility } from '@/mascot/visibility';
import { silentLoggerLayer } from '@/test/effect-log-test';
import { makeFakeCollectionBackend } from '@/test/fake-collection-backend';

const unmountFns: Array<() => void> = [];

afterEach(() => {
	while (unmountFns.length > 0) {
		unmountFns.pop()?.();
	}
});

describe('MascotOverlayRoot', () => {
	let runtime: Runtime.Runtime<CollectionBackendTag>;
	let managed: ManagedRuntime.ManagedRuntime<CollectionBackendTag, never>;

	beforeAll(async () => {
		const fake = await Effect.runPromise(makeFakeCollectionBackend);
		managed = ManagedRuntime.make(
			fake.layer.pipe(Layer.provideMerge(silentLoggerLayer)),
		);
		runtime = await managed.runtime();
	});

	afterAll(async () => {
		await managed.dispose();
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
