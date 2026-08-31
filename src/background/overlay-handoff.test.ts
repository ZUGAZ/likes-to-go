import { describe, expect, it } from 'vitest';

import {
	decideOverlayReveal,
	OverlayHandoffAwaitingPopupClose,
	OverlayHandoffIdle,
	OverlayHandoffRevealed,
} from '@/background/overlay-handoff';

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
