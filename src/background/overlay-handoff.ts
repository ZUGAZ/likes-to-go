import { runShowMascotOnTabEffect } from '@/background/action-popup-controller';
import {
	ContentOverlaySurface,
	isExtensionPopupSender,
	MascotUiSurfaceRefTag,
} from '@/background/mascot-ui-surface';
import { StateRefTag } from '@/background/state-ref';
import {
	collectionTabId,
	type CollectionState,
} from '@/common/model/collection/state';
import { taggedStruct } from '@/common/model/tagged-struct';
import { Context, Data, Effect, Ref, Schema } from 'effect';

type OverlayHandoffIdle = {
	readonly _tag: 'Idle';
};

export const OverlayHandoffIdle = Data.tagged<OverlayHandoffIdle>('Idle');

const OverlayHandoffAwaitingPopupCloseSchema = taggedStruct(
	'AwaitingPopupClose',
	{
		tabId: Schema.optional(Schema.Number),
	},
);

type OverlayHandoffAwaitingPopupClose = Schema.Schema.Type<
	typeof OverlayHandoffAwaitingPopupCloseSchema
>;

export const OverlayHandoffAwaitingPopupClose =
	Data.tagged<OverlayHandoffAwaitingPopupClose>('AwaitingPopupClose');

const isOverlayHandoffAwaitingPopupClose = Schema.is(
	OverlayHandoffAwaitingPopupCloseSchema,
);

type OverlayHandoffRevealed = {
	readonly _tag: 'Revealed';
};

export const OverlayHandoffRevealed =
	Data.tagged<OverlayHandoffRevealed>('Revealed');

type OverlayHandoff =
	| OverlayHandoffIdle
	| OverlayHandoffAwaitingPopupClose
	| OverlayHandoffRevealed;

export const defaultOverlayHandoff = (): OverlayHandoff => OverlayHandoffIdle();

export class OverlayHandoffRefTag extends Context.Tag('OverlayHandoffRef')<
	OverlayHandoffRefTag,
	Ref.Ref<OverlayHandoff>
>() {}

export class PopupPortCountRefTag extends Context.Tag('PopupPortCountRef')<
	PopupPortCountRefTag,
	Ref.Ref<number>
>() {}

const POPUP_DISCONNECT_GRACE_MS = 100;

interface OverlayRevealDecision {
	readonly nextHandoff: OverlayHandoff;
	readonly revealTabId: number | undefined;
}

export function decideOverlayReveal(input: {
	readonly handoff: OverlayHandoff;
	readonly popupConnected: boolean;
	readonly collectionTabId: number | undefined;
}): OverlayRevealDecision {
	if (!isOverlayHandoffAwaitingPopupClose(input.handoff)) {
		return {
			nextHandoff: input.handoff,
			revealTabId: undefined,
		};
	}

	const tabId = input.collectionTabId ?? input.handoff.tabId;
	const awaiting =
		tabId === undefined
			? OverlayHandoffAwaitingPopupClose({})
			: OverlayHandoffAwaitingPopupClose({ tabId });

	if (input.popupConnected || tabId === undefined) {
		return {
			nextHandoff: awaiting,
			revealTabId: undefined,
		};
	}

	return {
		nextHandoff: OverlayHandoffRevealed(),
		revealTabId: tabId,
	};
}

export function rememberOverlayHandoffFromSender(
	sender: chrome.runtime.MessageSender,
): Effect.Effect<void, never, OverlayHandoffRefTag> {
	return Effect.gen(function* () {
		const handoffRef = yield* OverlayHandoffRefTag;
		const next = isExtensionPopupSender(sender)
			? OverlayHandoffAwaitingPopupClose({})
			: OverlayHandoffIdle();
		yield* Ref.set(handoffRef, next);
		yield* Effect.log('overlay handoff remembered', {
			handoff: next._tag,
		});
	}).pipe(Effect.withLogSpan('rememberOverlayHandoff'));
}

export function resetOverlayHandoffEffect(): Effect.Effect<
	void,
	never,
	OverlayHandoffRefTag
> {
	return Effect.gen(function* () {
		const handoffRef = yield* OverlayHandoffRefTag;
		yield* Ref.set(handoffRef, OverlayHandoffIdle());
		yield* Effect.log('overlay handoff reset');
	}).pipe(Effect.withLogSpan('resetOverlayHandoff'));
}

export function maybeRevealOverlayEffect(): Effect.Effect<
	void,
	never,
	| OverlayHandoffRefTag
	| PopupPortCountRefTag
	| StateRefTag
	| MascotUiSurfaceRefTag
> {
	return Effect.gen(function* () {
		const handoffRef = yield* OverlayHandoffRefTag;
		const popupPortCountRef = yield* PopupPortCountRefTag;
		const stateRef = yield* StateRefTag;
		const surfaceRef = yield* MascotUiSurfaceRefTag;

		const popupConnected = (yield* Ref.get(popupPortCountRef)) > 0;
		const state: CollectionState = yield* Ref.get(stateRef);

		const revealTabId = yield* Ref.modify(handoffRef, (handoff) => {
			const decision = decideOverlayReveal({
				handoff,
				popupConnected,
				collectionTabId: collectionTabId(state),
			});
			return [decision.revealTabId, decision.nextHandoff] as const;
		});

		if (revealTabId === undefined) {
			return;
		}

		yield* Ref.set(surfaceRef, ContentOverlaySurface({ tabId: revealTabId }));
		yield* Effect.log('revealing overlay after popup closed', {
			tabId: revealTabId,
		});
		yield* runShowMascotOnTabEffect(revealTabId);
	}).pipe(Effect.withLogSpan('maybeRevealOverlay'));
}

export function handlePopupPortConnectedEffect(): Effect.Effect<
	void,
	never,
	PopupPortCountRefTag
> {
	return Effect.gen(function* () {
		const popupPortCountRef = yield* PopupPortCountRefTag;
		yield* Ref.update(popupPortCountRef, (count) => count + 1);
		yield* Effect.log('popup port connected');
	}).pipe(Effect.withLogSpan('handlePopupPortConnected'));
}

export function handlePopupPortDisconnectedEffect(): Effect.Effect<
	void,
	never,
	| OverlayHandoffRefTag
	| PopupPortCountRefTag
	| StateRefTag
	| MascotUiSurfaceRefTag
> {
	return Effect.gen(function* () {
		const popupPortCountRef = yield* PopupPortCountRefTag;
		yield* Ref.update(popupPortCountRef, (count) => Math.max(0, count - 1));
		yield* Effect.log('popup port disconnected');
		yield* Effect.sleep(POPUP_DISCONNECT_GRACE_MS);
		yield* maybeRevealOverlayEffect();
	}).pipe(Effect.withLogSpan('handlePopupPortDisconnected'));
}
