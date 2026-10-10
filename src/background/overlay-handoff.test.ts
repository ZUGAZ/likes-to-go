import { describe, expect, it } from 'vitest';
import {
	Content,
	ExtensionPage,
	Popup,
	PortInfo,
} from 'browser-extension-kit/messaging';
import { Effect, HashMap, Ref } from 'effect';

import {
	decideOverlayReveal,
	isPopupOpenEffect,
	OverlayHandoffAwaitingPopupClose,
	OverlayHandoffIdle,
	OverlayHandoffRefTag,
	OverlayHandoffRevealed,
	popupPresentIn,
	rememberOverlayHandoffFromCaller,
} from '@/background/overlay-handoff';
import { makeBackgroundTestLayer } from '@/test/background-test-layer';

describe('decideOverlayReveal', () => {
	it('does not reveal when the run did not start from the popup', () => {
		expect(
			decideOverlayReveal({
				handoff: OverlayHandoffIdle(),
				popupConnected: false,
				collectionTabId: 7,
			}),
		).toEqual({
			nextHandoff: OverlayHandoffIdle(),
			revealTabId: undefined,
		});
	});

	it('does not re-summon after the overlay was already revealed', () => {
		expect(
			decideOverlayReveal({
				handoff: OverlayHandoffRevealed(),
				popupConnected: false,
				collectionTabId: 7,
			}),
		).toEqual({
			nextHandoff: OverlayHandoffRevealed(),
			revealTabId: undefined,
		});
	});

	it('keeps waiting when the popup is still open', () => {
		expect(
			decideOverlayReveal({
				handoff: OverlayHandoffAwaitingPopupClose({}),
				popupConnected: true,
				collectionTabId: 7,
			}),
		).toEqual({
			nextHandoff: OverlayHandoffAwaitingPopupClose({ tabId: 7 }),
			revealTabId: undefined,
		});
	});

	it('keeps waiting when the popup is gone but no collection tab exists yet', () => {
		expect(
			decideOverlayReveal({
				handoff: OverlayHandoffAwaitingPopupClose({}),
				popupConnected: false,
				collectionTabId: undefined,
			}),
		).toEqual({
			nextHandoff: OverlayHandoffAwaitingPopupClose({}),
			revealTabId: undefined,
		});
	});

	it('reveals the likes-tab overlay when the popup is gone', () => {
		expect(
			decideOverlayReveal({
				handoff: OverlayHandoffAwaitingPopupClose({}),
				popupConnected: false,
				collectionTabId: 11,
			}),
		).toEqual({
			nextHandoff: OverlayHandoffRevealed(),
			revealTabId: 11,
		});
	});

	it('uses a remembered tab id after collection no longer stores one', () => {
		expect(
			decideOverlayReveal({
				handoff: OverlayHandoffAwaitingPopupClose({ tabId: 15 }),
				popupConnected: false,
				collectionTabId: undefined,
			}),
		).toEqual({
			nextHandoff: OverlayHandoffRevealed(),
			revealTabId: 15,
		});
	});
});

describe('popupPresentIn', () => {
	const info = new PortInfo({ connections: 1 });

	it('is false when nobody popup-like is present', () => {
		expect(popupPresentIn(HashMap.empty())).toBe(false);
		expect(
			popupPresentIn(
				HashMap.set(
					HashMap.empty(),
					new Content({ tabId: 7, frameId: 0 }),
					info,
				),
			),
		).toBe(false);
	});

	it('is true for a popup or an extension page', () => {
		expect(
			popupPresentIn(HashMap.set(HashMap.empty(), new Popup(), info)),
		).toBe(true);
		expect(
			popupPresentIn(
				HashMap.set(HashMap.empty(), new ExtensionPage({ tabId: 3 }), info),
			),
		).toBe(true);
	});
});

describe('caller handoff and popup open', () => {
	it('remembers awaiting close for popup-like callers only', async () => {
		const layer = makeBackgroundTestLayer();
		const handoffFor = (caller: Popup | ExtensionPage | Content) =>
			Effect.runPromise(
				Effect.gen(function* () {
					yield* rememberOverlayHandoffFromCaller(caller);
					return yield* Ref.get(yield* OverlayHandoffRefTag);
				}).pipe(Effect.provide(layer)),
			);

		await expect(handoffFor(new Popup())).resolves.toEqual(
			OverlayHandoffAwaitingPopupClose({}),
		);
		await expect(handoffFor(new ExtensionPage({ tabId: 3 }))).resolves.toEqual(
			OverlayHandoffAwaitingPopupClose({}),
		);
		await expect(
			handoffFor(new Content({ tabId: 7, frameId: 0 })),
		).resolves.toEqual(OverlayHandoffIdle());
	});

	it('is open when the legacy count or presence says so', async () => {
		const cases = [
			{ popupPortCount: 0, popupPresenceOpen: false, open: false },
			{ popupPortCount: 1, popupPresenceOpen: false, open: true },
			{ popupPortCount: 0, popupPresenceOpen: true, open: true },
			{ popupPortCount: 2, popupPresenceOpen: true, open: true },
		];
		for (const entry of cases) {
			const open = await Effect.runPromise(
				isPopupOpenEffect.pipe(
					Effect.provide(
						makeBackgroundTestLayer({
							popupPortCount: entry.popupPortCount,
							popupPresenceOpen: entry.popupPresenceOpen,
						}),
					),
				),
			);
			expect(open).toBe(entry.open);
		}
	});
});
