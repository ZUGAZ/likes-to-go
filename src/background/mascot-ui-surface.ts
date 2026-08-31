import { Context, Data, Effect, Ref } from 'effect';

export type ExtensionPopupSurface = {
	readonly _tag: 'ExtensionPopup';
};

export const ExtensionPopupSurface =
	Data.tagged<ExtensionPopupSurface>('ExtensionPopup');

export type ContentOverlaySurface = {
	readonly _tag: 'ContentOverlay';
	readonly tabId: number;
};

export const ContentOverlaySurface =
	Data.tagged<ContentOverlaySurface>('ContentOverlay');

export type MascotUiSurface = ExtensionPopupSurface | ContentOverlaySurface;

export const defaultMascotUiSurface = (): MascotUiSurface =>
	ExtensionPopupSurface();

export class MascotUiSurfaceRefTag extends Context.Tag('MascotUiSurfaceRef')<
	MascotUiSurfaceRefTag,
	Ref.Ref<MascotUiSurface>
>() {}

export function isExtensionPopupSender(
	sender: chrome.runtime.MessageSender,
): boolean {
	if (sender.tab?.id === undefined) {
		return true;
	}

	const senderUrl = sender.url ?? sender.tab.url;
	if (senderUrl === undefined) {
		return false;
	}

	return senderUrl.startsWith('chrome-extension:');
}

export function mascotUiSurfaceFromSender(
	sender: chrome.runtime.MessageSender,
): MascotUiSurface {
	if (isExtensionPopupSender(sender)) {
		return ExtensionPopupSurface();
	}

	const tabId = sender.tab?.id;
	if (tabId === undefined) {
		return ExtensionPopupSurface();
	}

	return ContentOverlaySurface({ tabId });
}

export function shouldClaimMascotNotifySurface(input: {
	readonly claimsFromMessage: boolean;
	readonly popupConnected: boolean;
	readonly senderIsExtensionPopup: boolean;
}): boolean {
	if (!input.claimsFromMessage) {
		return false;
	}

	if (input.popupConnected && !input.senderIsExtensionPopup) {
		return false;
	}

	return true;
}

export function rememberMascotUiSurfaceFromSender(
	sender: chrome.runtime.MessageSender,
): Effect.Effect<void, never, MascotUiSurfaceRefTag> {
	return Effect.gen(function* () {
		const surfaceRef = yield* MascotUiSurfaceRefTag;
		const surface = mascotUiSurfaceFromSender(sender);
		yield* Ref.set(surfaceRef, surface);
		yield* Effect.log('mascot UI surface remembered', {
			surface: surface._tag,
			...(surface._tag === 'ContentOverlay' ? { tabId: surface.tabId } : {}),
		});
	});
}

export function getMascotUiSurfaceEffect(): Effect.Effect<
	MascotUiSurface,
	never,
	MascotUiSurfaceRefTag
> {
	return Effect.gen(function* () {
		const surfaceRef = yield* MascotUiSurfaceRefTag;
		return yield* Ref.get(surfaceRef);
	});
}
