import { runShowMascotOnTabEffect } from '@/background/action-popup-controller';
import type { ContentCommandsTag } from '@/background/content-commands';
import { DispatchLaneTag } from '@/background/dispatch-lane';
import {
	ContentOverlaySurface,
	isPopupLikeCaller,
	MascotUiSurfaceRefTag,
} from '@/background/mascot-ui-surface';
import { StateRefTag } from '@/background/state-ref';
import { collectionTabId } from '@/common/model/collection/state';
import { taggedStruct } from '@/common/model/tagged-struct';
import type { Endpoint, PortInfo } from 'browser-extension-kit/messaging';
import {
	Context,
	Data,
	Effect,
	HashMap,
	Ref,
	Schema,
	SubscriptionRef,
} from 'effect';

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

export class PopupPresenceRefTag extends Context.Tag('PopupPresenceRef')<
	PopupPresenceRefTag,
	Ref.Ref<boolean>
>() {}

export function popupPresentIn(
	presence: HashMap.HashMap<Endpoint, PortInfo>,
): boolean {
	return HashMap.some(presence, (_info, endpoint) =>
		isPopupLikeCaller(endpoint),
	);
}

export const isPopupOpenEffect: Effect.Effect<
	boolean,
	never,
	PopupPresenceRefTag
> = PopupPresenceRefTag.pipe(Effect.flatMap(Ref.get));

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

export function rememberOverlayHandoffFromCaller(
	caller: Endpoint,
): Effect.Effect<void, never, OverlayHandoffRefTag> {
	return Effect.gen(function* () {
		const handoffRef = yield* OverlayHandoffRefTag;
		const next = isPopupLikeCaller(caller)
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
	| PopupPresenceRefTag
	| StateRefTag
	| MascotUiSurfaceRefTag
	| ContentCommandsTag
> {
	return Effect.gen(function* () {
		const handoffRef = yield* OverlayHandoffRefTag;
		const stateRef = yield* StateRefTag;
		const surfaceRef = yield* MascotUiSurfaceRefTag;

		const popupConnected = yield* isPopupOpenEffect;
		const state = yield* SubscriptionRef.get(stateRef);

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

export function revealOverlayAfterPopupClosedEffect(): Effect.Effect<
	void,
	never,
	DispatchLaneTag
> {
	return Effect.gen(function* () {
		yield* Effect.sleep(POPUP_DISCONNECT_GRACE_MS);
		const lane = yield* DispatchLaneTag;
		yield* lane.submit(maybeRevealOverlayEffect());
	});
}
