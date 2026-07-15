import { taggedStruct } from '@/common/model/tagged-struct';
import { Context, Data, Effect, Ref, Schema } from 'effect';

export const ExtensionPopupSurfaceSchema = taggedStruct('ExtensionPopup');

export type ExtensionPopupSurface = Schema.Schema.Type<
	typeof ExtensionPopupSurfaceSchema
>;

export const ExtensionPopupSurface =
	Data.tagged<ExtensionPopupSurface>('ExtensionPopup');

export const ContentOverlaySurfaceSchema = taggedStruct('ContentOverlay', {
	tabId: Schema.Number,
});

export type ContentOverlaySurface = Schema.Schema.Type<
	typeof ContentOverlaySurfaceSchema
>;

export const ContentOverlaySurface = Data.tagged<ContentOverlaySurface>(
	'ContentOverlay',
);

export const MascotUiSurfaceSchema = Schema.Union(
	ExtensionPopupSurfaceSchema,
	ContentOverlaySurfaceSchema,
);

export type MascotUiSurface = Schema.Schema.Type<typeof MascotUiSurfaceSchema>;

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
