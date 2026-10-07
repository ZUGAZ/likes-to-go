import { Rpc, RpcGroup } from '@effect/rpc';

/** Command from the background. Runs the collection pipeline on this page and succeeds once the pipeline is started, not when it finishes. Progress comes back as `BackgroundRpcs` fire-and-forget calls. */
export const StartPageCollection = Rpc.make('StartPageCollection');

/** Command from the background. Stops the collection pipeline on this page. */
export const CancelPageCollection = Rpc.make('CancelPageCollection');

/** Command from the background. Toggles whether the mascot is visible on this page. */
export const ToggleMascot = Rpc.make('ToggleMascot');

/** Command from the background. Shows the mascot on this page. */
export const ShowMascot = Rpc.make('ShowMascot');

/**
 * Served by content on `CONTENT_RPC_PORT_NAME` (`likes-to-go/content`).
 * The background calls it through `clientFor(Content)`.
 * `ReceiverUnavailable` and `Disconnected` both mean the receiver is gone.
 */
export class ContentRpcs extends RpcGroup.make(
	StartPageCollection,
	CancelPageCollection,
	ToggleMascot,
	ShowMascot,
) {}
