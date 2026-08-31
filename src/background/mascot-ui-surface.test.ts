import { describe, expect, it } from 'vitest';

import {
	ContentOverlaySurface,
	ExtensionPopupSurface,
	mascotUiSurfaceFromSender,
	shouldClaimMascotNotifySurface,
} from '@/background/mascot-ui-surface';
import { resolveMascotNotifyDestination } from '@/background/resolve-mascot-notify-destination';

describe('mascotUiSurfaceFromSender', () => {
	it('maps popup senders without tab to ExtensionPopup', () => {
		expect(mascotUiSurfaceFromSender({})).toEqual(ExtensionPopupSurface());
	});

	it('maps extension-page senders with a tab to ExtensionPopup', () => {
		expect(
			mascotUiSurfaceFromSender({
				url: 'chrome-extension://id/popup.html',
				tab: {
					id: 9,
					url: 'chrome-extension://id/popup.html',
				} as chrome.tabs.Tab,
			}),
		).toEqual(ExtensionPopupSurface());
	});

	it('maps content-script senders to ContentOverlay with tab id', () => {
		expect(
			mascotUiSurfaceFromSender({
				tab: { id: 42 } as chrome.tabs.Tab,
			}),
		).toEqual(ContentOverlaySurface({ tabId: 42 }));
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

describe('resolveMascotNotifyDestination', () => {
	it('keeps popup surface as popup destination', () => {
		expect(resolveMascotNotifyDestination(ExtensionPopupSurface())).toEqual(
			ExtensionPopupSurface(),
		);
	});

	it('keeps overlay surface as overlay destination', () => {
		expect(
			resolveMascotNotifyDestination(ContentOverlaySurface({ tabId: 7 })),
		).toEqual(ContentOverlaySurface({ tabId: 7 }));
	});
});
