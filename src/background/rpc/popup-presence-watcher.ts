import { DispatchLaneTag } from '@/background/dispatch-lane';
import {
	popupPresentIn,
	PopupPresenceRefTag,
	revealOverlayAfterPopupClosedEffect,
} from '@/background/overlay-handoff';
import { watchPresence, type Presence } from 'browser-extension-kit/messaging';
import { Effect, Layer, Option, Ref, Stream } from 'effect';

export const PopupPresenceWatcherLive: Layer.Layer<
	never,
	never,
	Presence | PopupPresenceRefTag | DispatchLaneTag
> = Layer.scopedDiscard(
	watchPresence.pipe(
		Stream.map(popupPresentIn),
		Stream.changes,
		Stream.zipWithPrevious,
		Stream.runForEach(([previous, open]) =>
			Effect.gen(function* () {
				const presenceRef = yield* PopupPresenceRefTag;
				yield* Ref.set(presenceRef, open);
				if (open) {
					yield* Effect.log('popup presence open');
				} else if (Option.contains(previous, true)) {
					yield* Effect.log('popup presence closed');
					yield* Effect.fork(revealOverlayAfterPopupClosedEffect());
				}
			}),
		),
		Effect.withLogSpan('PopupPresence'),
		Effect.forkScoped,
	),
);
