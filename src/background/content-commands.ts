import {
	Disconnected,
	PortRpcError,
	ReceiverUnavailable,
} from 'browser-extension-kit/messaging';
import { Context, Effect, Schema } from 'effect';

import { SendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';

/**
 * Background → content commands.
 * Production wires {@link ContentCommandsRpc}.
 */
export interface ContentCommands {
	readonly startPageCollection: (
		tabId: number,
	) => Effect.Effect<void, SendToTabFailed>;
	readonly cancelPageCollection: (
		tabId: number,
	) => Effect.Effect<void, SendToTabFailed>;
	readonly toggleMascot: (tabId: number) => Effect.Effect<void>;
	readonly showMascot: (tabId: number) => Effect.Effect<void>;
}

export class ContentCommandsTag extends Context.Tag('ContentCommands')<
	ContentCommandsTag,
	ContentCommands
>() {}

/** The content script is the top frame only. */
export const CONTENT_TOP_FRAME_ID = 0;

const isDisconnected = Schema.is(Disconnected);

/** Maps a missing content receiver onto the collection event the state machine already handles. */
export function receiverGoneToSendToTabFailed(
	error: ReceiverUnavailable | PortRpcError,
): SendToTabFailed {
	const detail = isDisconnected(error) ? error.detail : undefined;
	const reason = detail === undefined ? error._tag : `${error._tag}: ${detail}`;
	return SendToTabFailed({
		message: 'Could not open or talk to the likes page',
		reason,
	});
}
