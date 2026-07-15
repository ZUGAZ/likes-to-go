import { describe, expect, it } from 'vitest';

import {
	ContentOverlaySurface,
	ExtensionPopupSurface,
	mascotUiSurfaceFromSender,
} from '@/background/mascot-ui-surface';
import { resolveMascotNotifyDestination } from '@/background/resolve-mascot-notify-destination';

describe('mascotUiSurfaceFromSender', () => {
	it('maps popup senders without tab to ExtensionPopup', () => {
		expect(mascotUiSurfaceFromSender({})).toEqual(ExtensionPopupSurface());
	});

	it('maps content-script senders to ContentOverlay with tab id', () => {
		expect(
			mascotUiSurfaceFromSender({
				tab: { id: 42 } as chrome.tabs.Tab,
			}),
		).toEqual(ContentOverlaySurface({ tabId: 42 }));
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
