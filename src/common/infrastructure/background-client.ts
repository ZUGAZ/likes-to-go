import { BackgroundRpcs } from '@/common/model/messaging/background-rpcs';
import { BACKGROUND_RPC_PORT_NAME } from '@/common/model/messaging/port-names';
import {
	makeBackgroundClient,
	type PageLifecycle,
	type PortConnector,
} from 'browser-extension-kit/messaging';
import { Context, Effect, Layer } from 'effect';

const backgroundClient = makeBackgroundClient(BackgroundRpcs, {
	name: BACKGROUND_RPC_PORT_NAME,
});

type BackgroundClientService = Effect.Effect.Success<typeof backgroundClient>;

/**
 * One client, and so one port, per extension context.
 * Its open port is also this context's presence in the background.
 */
export class BackgroundClientTag extends Context.Tag('BackgroundClient')<
	BackgroundClientTag,
	BackgroundClientService
>() {}

export const BackgroundClientLive: Layer.Layer<
	BackgroundClientTag,
	never,
	PortConnector | PageLifecycle
> = Layer.scoped(BackgroundClientTag, backgroundClient);
