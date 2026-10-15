import { describe, expect, it } from 'vitest';
import { Content, ExtensionPage, Popup } from 'browser-extension-kit/messaging';

import {
	ContentOverlaySurface,
	ExtensionPopupSurface,
	isPopupLikeCaller,
	mascotUiSurfaceFromCaller,
	shouldClaimMascotNotifySurface,
} from '@/background/mascot-ui-surface';

describe('mascotUiSurfaceFromCaller', () => {
	it('treats popup and extension page callers as the extension popup', () => {
		expect(isPopupLikeCaller(new Popup())).toBe(true);
		expect(isPopupLikeCaller(new ExtensionPage({ tabId: 3 }))).toBe(true);
		expect(isPopupLikeCaller(new Content({ tabId: 7, frameId: 0 }))).toBe(
			false,
		);
		expect(mascotUiSurfaceFromCaller(new Popup())).toEqual(
			ExtensionPopupSurface(),
		);
		expect(mascotUiSurfaceFromCaller(new ExtensionPage({ tabId: 3 }))).toEqual(
			ExtensionPopupSurface(),
		);
		expect(
			mascotUiSurfaceFromCaller(new Content({ tabId: 7, frameId: 0 })),
		).toEqual(ContentOverlaySurface({ tabId: 7 }));
	});
});

describe('shouldClaimMascotNotifySurface', () => {
	it('does not claim from GetState', () => {
		expect(
			shouldClaimMascotNotifySurface({
				claimsFromMessage: false,
				popupConnected: false,
				senderIsExtensionPopup: false,
			}),
		).toBe(false);
	});

	it('keeps popup as the Beat when an overlay sender arrives while the popup is open', () => {
		expect(
			shouldClaimMascotNotifySurface({
				claimsFromMessage: true,
				popupConnected: true,
				senderIsExtensionPopup: false,
			}),
		).toBe(false);
	});

	it('claims from popup StartCollection while the popup is open', () => {
		expect(
			shouldClaimMascotNotifySurface({
				claimsFromMessage: true,
				popupConnected: true,
				senderIsExtensionPopup: true,
			}),
		).toBe(true);
	});

	it('claims from overlay StartCollection when the popup is gone', () => {
		expect(
			shouldClaimMascotNotifySurface({
				claimsFromMessage: true,
				popupConnected: false,
				senderIsExtensionPopup: false,
			}),
		).toBe(true);
	});
});
