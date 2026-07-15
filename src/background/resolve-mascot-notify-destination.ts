import {
	ContentOverlaySurface,
	ExtensionPopupSurface,
	type MascotUiSurface,
} from '@/background/mascot-ui-surface';

export type MascotNotifyDestination = MascotUiSurface;

export function resolveMascotNotifyDestination(
	surface: MascotUiSurface,
): MascotNotifyDestination {
	if (surface._tag === 'ContentOverlay') {
		return ContentOverlaySurface({ tabId: surface.tabId });
	}
	return ExtensionPopupSurface();
}
