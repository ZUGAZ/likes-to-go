import { CommandRunnerTag, runCommand } from '@/background/command-runner';
import { ContentCommandsLegacy } from '@/background/infrastructure/content-commands-legacy';
import {
	CollectionStateStorageLive,
	CollectionStateStorageTag,
} from '@/background/infrastructure/collection-state-storage';
import {
	defaultMascotUiSurface,
	MascotUiSurfaceRefTag,
} from '@/background/mascot-ui-surface';
import {
	defaultOverlayHandoff,
	OverlayHandoffRefTag,
	PopupPresenceRefTag,
} from '@/background/overlay-handoff';
import { BackgroundRpcServerLive } from '@/background/rpc/background-rpc-server';
import { PopupPresenceWatcherLive } from '@/background/rpc/popup-presence-watcher';
import type { BackgroundEnv } from '@/background/runtime/background-env';
import {
	CollectionStateHydratedTag,
	StateRefTag,
} from '@/background/state-ref';
import {
	DispatchLaneLive,
	DispatchLaneWorkerLive,
} from '@/background/dispatch-lane';
import { ContentCommandsTag } from '@/background/content-commands';
import { SpanLoggerLive } from '@/common/infrastructure/logger';
import { initialCollectionState } from '@/common/model/collection/transition';
import {
	PortConnector,
	PortConnectorLive,
	type Presence,
} from 'browser-extension-kit/messaging';
import { Context, Deferred, Effect, Layer, Ref, SubscriptionRef } from 'effect';

const CollectionStateLive: Layer.Layer<
	StateRefTag | CollectionStateHydratedTag,
	never,
	CollectionStateStorageTag
> = Layer.scopedContext(
	Effect.gen(function* () {
		const storage = yield* CollectionStateStorageTag;
		const ref = yield* SubscriptionRef.make(initialCollectionState);
		const gate = yield* Deferred.make<boolean>();
		yield* storage.load().pipe(
			Effect.flatMap((loaded) =>
				loaded === null ? Effect.void : SubscriptionRef.set(ref, loaded),
			),
			Effect.catchAll((error) =>
				Effect.logWarning('collection state hydration failed', error.reason),
			),
			Effect.ensuring(Deferred.succeed(gate, true).pipe(Effect.asVoid)),
			Effect.forkScoped,
		);
		return Context.add(
			Context.make(StateRefTag, ref),
			CollectionStateHydratedTag,
			{ await: Deferred.await(gate).pipe(Effect.asVoid) },
		);
	}),
);

const MascotUiSurfaceRefLive: Layer.Layer<MascotUiSurfaceRefTag> = Layer.effect(
	MascotUiSurfaceRefTag,
	Ref.make(defaultMascotUiSurface()),
);

const OverlayHandoffRefLive: Layer.Layer<OverlayHandoffRefTag> = Layer.effect(
	OverlayHandoffRefTag,
	Ref.make(defaultOverlayHandoff()),
);

const PopupPresenceRefLive: Layer.Layer<PopupPresenceRefTag> = Layer.effect(
	PopupPresenceRefTag,
	Ref.make(false),
);

const CommandRunnerLive: Layer.Layer<CommandRunnerTag> = Layer.succeed(
	CommandRunnerTag,
	{ run: runCommand },
);

export function makeBackgroundLayer(deps: {
	readonly portConnector: Layer.Layer<PortConnector>;
	readonly storage: Layer.Layer<CollectionStateStorageTag>;
	readonly commandRunner: Layer.Layer<CommandRunnerTag>;
	readonly contentCommands: Layer.Layer<
		ContentCommandsTag,
		never,
		Presence | PortConnector
	>;
	readonly logger: Layer.Layer<never>;
}) {
	const bottom = Layer.mergeAll(
		CollectionStateLive.pipe(Layer.provideMerge(deps.storage)),
		MascotUiSurfaceRefLive,
		OverlayHandoffRefLive,
		PopupPresenceRefLive,
		DispatchLaneLive,
		deps.commandRunner,
	).pipe(Layer.provideMerge(deps.logger));

	const middle = BackgroundRpcServerLive.pipe(
		Layer.provideMerge(bottom),
		Layer.provideMerge(deps.portConnector),
	);

	return Layer.mergeAll(DispatchLaneWorkerLive, PopupPresenceWatcherLive).pipe(
		Layer.provideMerge(deps.contentCommands),
		Layer.provideMerge(middle),
		Layer.provideMerge(deps.logger),
	);
}

export const BackgroundLive = makeBackgroundLayer({
	portConnector: PortConnectorLive,
	storage: CollectionStateStorageLive,
	commandRunner: CommandRunnerLive,
	contentCommands: ContentCommandsLegacy,
	logger: SpanLoggerLive,
}) satisfies Layer.Layer<BackgroundEnv>;
