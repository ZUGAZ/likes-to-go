import { describe, expect, it, vi } from 'vitest';
import { Effect, Layer, ManagedRuntime } from 'effect';

import { mountBeatOverlay } from '@/content/beat-overlay/mount-beat-overlay';
import { createMascotVisibility } from '@/mascot/visibility';
import { silentLoggerLayer } from '@/test/effect-log-test';
import { makeFakeCollectionBackend } from '@/test/fake-collection-backend';

const { getResolvedPopupThemeMock } = vi.hoisted(() => ({
	getResolvedPopupThemeMock: vi.fn(() => Effect.succeed('light' as const)),
}));

vi.mock('@/common/infrastructure/get-resolved-popup-theme', () => ({
	getResolvedPopupThemeEffect: getResolvedPopupThemeMock,
}));

const { createShadowRootUiMock } = vi.hoisted(() => ({
	createShadowRootUiMock: vi.fn(),
}));

vi.mock('wxt/utils/content-script-ui/shadow-root', () => ({
	createShadowRootUi: createShadowRootUiMock,
}));

vi.mock('wxt/utils/content-script-context', () => ({
	ContentScriptContext: class MockContentScriptContext {
		readonly isValid = true;
		onInvalidated(): () => void {
			return () => {};
		}
	},
}));

import { ContentScriptContext } from 'wxt/utils/content-script-context';

describe('mountBeatOverlay', () => {
	it('creates shadow root UI with overlay options and mounts Beat', async () => {
		const mount = vi.fn();
		const remove = vi.fn();
		let capturedOnMount:
			| ((
					uiContainer: HTMLElement,
					shadow: ShadowRoot,
					shadowHost: HTMLElement,
			  ) => unknown)
			| undefined;
		let capturedOnRemove: ((mounted: unknown) => void) | undefined;

		createShadowRootUiMock.mockImplementation(
			(
				_ctx: unknown,
				options: {
					onMount: typeof capturedOnMount;
					onRemove: typeof capturedOnRemove;
				},
			) => {
				capturedOnMount = options.onMount;
				capturedOnRemove = options.onRemove;
				return Promise.resolve({ mount, remove });
			},
		);

		const ctx = new ContentScriptContext('likes');

		const fake = await Effect.runPromise(makeFakeCollectionBackend);
		const managed = ManagedRuntime.make(
			fake.layer.pipe(Layer.provideMerge(silentLoggerLayer)),
		);
		const runtime = await managed.runtime();
		const visibility = createMascotVisibility(false);

		const handle = await mountBeatOverlay(ctx, runtime, visibility);

		expect(createShadowRootUiMock).toHaveBeenCalledWith(
			ctx,
			expect.objectContaining({
				name: 'likes-to-go-beat',
				position: 'inline',
				anchor: 'body',
				isolateEvents: true,
			}),
		);
		expect(mount).toHaveBeenCalledTimes(1);

		const uiContainer = document.createElement('div');
		const shadowHost = document.createElement('div');
		const shadow = shadowHost.attachShadow({ mode: 'open' });
		const shadowHtml = document.createElement('html');
		shadow.append(shadowHtml);

		const unmount = capturedOnMount?.(uiContainer, shadow, shadowHost);
		expect(shadowHtml.classList.contains('beat-overlay-root')).toBe(true);
		expect(typeof unmount).toBe('function');

		capturedOnRemove?.(unmount);
		handle.remove();
		expect(remove).toHaveBeenCalledTimes(1);

		await managed.dispose();
	});
});
