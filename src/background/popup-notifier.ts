import { Context, Effect, Layer } from 'effect';

import { sendStateToPopup } from '@/common/infrastructure/send-state-to-popup';
import { PopupStateUpdate } from '@/common/model/popup-state-update';
import type { GetStateResponse } from '@/common/model/request-message';

export interface PopupNotifier {
	readonly notify: (state: GetStateResponse) => Effect.Effect<void>;
}

export class PopupNotifierTag extends Context.Tag('PopupNotifier')<
	PopupNotifierTag,
	PopupNotifier
>() {}

export const PopupNotifierLive = Layer.succeed(PopupNotifierTag, {
	notify: (state) =>
		sendStateToPopup(
			PopupStateUpdate({
				status: state.status,
				trackCount: state.trackCount,
				...(state.errorMessage === undefined
					? {}
					: { errorMessage: state.errorMessage }),
			}),
		),
});
