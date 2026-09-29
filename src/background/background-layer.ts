import { Effect, Layer, Ref } from 'effect';
import { SpanLoggerLive } from '@/common/infrastructure/logger';
import { initialCollectionState } from '@/common/model/collection/transition';
import { CommandRunnerTag, runCommand } from '@/background/command-runner';
import {
	CollectionStateStorageLive,
	loadCollectionStateEffect,
} from '@/background/infrastructure/collection-state-storage';
import {
	defaultMascotUiSurface,
	MascotUiSurfaceRefTag,
} from '@/background/mascot-ui-surface';
import {
	defaultOverlayHandoff,
	OverlayHandoffRefTag,
	PopupPortCountRefTag,
} from '@/background/overlay-handoff';
import { StateRefTag } from '@/background/state-ref';

const StateRefLive: Layer.Layer<StateRefTag> = Layer.effect(
	StateRefTag,
	loadCollectionStateEffect().pipe(
		Effect.catchAll((error) =>
			Effect.logWarning('collection state hydration failed', error.reason).pipe(
				Effect.as(null),
			),
		),
		Effect.flatMap((state) => Ref.make(state ?? initialCollectionState)),
	),
);

const MascotUiSurfaceRefLive: Layer.Layer<MascotUiSurfaceRefTag> = Layer.effect(
	MascotUiSurfaceRefTag,
	Ref.make(defaultMascotUiSurface()),
);

const OverlayHandoffRefLive: Layer.Layer<OverlayHandoffRefTag> = Layer.effect(
	OverlayHandoffRefTag,
	Ref.make(defaultOverlayHandoff()),
);

const PopupPortCountRefLive: Layer.Layer<PopupPortCountRefTag> = Layer.effect(
	PopupPortCountRefTag,
	Ref.make(0),
);

const CommandRunnerLive: Layer.Layer<CommandRunnerTag> = Layer.succeed(
	CommandRunnerTag,
	{ run: runCommand },
);

export const BackgroundLive = Layer.mergeAll(
	StateRefLive,
	MascotUiSurfaceRefLive,
	OverlayHandoffRefLive,
	PopupPortCountRefLive,
	CommandRunnerLive,
	CollectionStateStorageLive,
	SpanLoggerLive,
);
