import { BackgroundRpcHandlersLive } from '@/background/rpc/background-rpc-handlers';
import { BACKGROUND_RPC_PORT_NAME } from '@/common/model/messaging/port-names';
import { BackgroundRpcs } from '@/common/model/messaging/background-rpcs';
import {
	layerPortServer,
	layerPresence,
} from 'browser-extension-kit/messaging';
import { Layer } from 'effect';

export const BackgroundRpcServerLive = layerPresence.pipe(
	Layer.provideMerge(
		layerPortServer(BackgroundRpcs, { name: BACKGROUND_RPC_PORT_NAME }),
	),
	Layer.provide(BackgroundRpcHandlersLive),
);
