import { ContentRpcs } from '@/common/model/messaging/content-rpcs';
import { CONTENT_RPC_PORT_NAME } from '@/common/model/messaging/port-names';
import { MascotControlsTag } from '@/content/mascot-controls';
import { PageCollectionTag } from '@/content/page-collection';
import { layerPortServer } from 'browser-extension-kit/messaging';
import { Effect, Layer } from 'effect';

const ContentRpcHandlersLive = ContentRpcs.toLayer(
	Effect.gen(function* () {
		const pageCollection = yield* PageCollectionTag;
		const controls = yield* MascotControlsTag;

		return {
			StartPageCollection: () =>
				pageCollection.start.pipe(
					Effect.zipRight(Effect.log('StartPageCollection received')),
					Effect.withLogSpan('StartPageCollection'),
				),
			CancelPageCollection: () =>
				pageCollection.cancel.pipe(
					Effect.zipRight(Effect.log('CancelPageCollection received')),
					Effect.withLogSpan('CancelPageCollection'),
				),
			ToggleMascot: () =>
				Effect.log('ToggleMascot received').pipe(
					Effect.zipRight(Effect.sync(() => controls.toggle())),
					Effect.zipRight(
						Effect.log('overlay visibility toggled', {
							visible: controls.isVisible(),
						}),
					),
					Effect.withLogSpan('ToggleMascot'),
				),
			ShowMascot: () =>
				Effect.log('ShowMascot received').pipe(
					Effect.zipRight(Effect.sync(() => controls.summon())),
					Effect.zipRight(
						Effect.log('overlay visibility shown', {
							visible: controls.isVisible(),
						}),
					),
					Effect.withLogSpan('ShowMascot'),
				),
		};
	}),
);

export const ContentRpcServerLive = layerPortServer(ContentRpcs, {
	name: CONTENT_RPC_PORT_NAME,
}).pipe(Layer.provide(ContentRpcHandlersLive));
