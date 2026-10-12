import { BackgroundClientLive } from '@/common/infrastructure/background-client';
import { SpanLoggerLive } from '@/common/infrastructure/logger';
import { CollectionBackendRpc } from '@/mascot/infrastructure/collection-backend-rpc';
import type { PopupEnv } from '@/popup/runtime/popup-env';
import {
	PageLifecycleNone,
	PortConnectorLive,
} from 'browser-extension-kit/messaging';
import { Layer } from 'effect';

/**
 * Popup collection client.
 * The background port opens with the runtime and stays open for the page's lifetime.
 */
export const PopupLive: Layer.Layer<PopupEnv> = CollectionBackendRpc.pipe(
	Layer.provide(BackgroundClientLive),
	Layer.provide(Layer.mergeAll(PortConnectorLive, PageLifecycleNone)),
	Layer.provideMerge(SpanLoggerLive),
);
