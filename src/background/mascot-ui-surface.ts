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

export function mascotUiSurfaceFromSender(
	sender: chrome.runtime.MessageSender,
): MascotUiSurface {
	const tabId = sender.tab?.id;
	if (tabId === undefined) {
		return ExtensionPopupSurface();
	}
	return ContentOverlaySurface({ tabId });
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
