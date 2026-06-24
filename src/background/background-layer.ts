import { Effect, Layer, Ref } from 'effect';
import { HeartLoggerLive } from '@/common/infrastructure/logger';
import { initialCollectionState } from '@/common/model/collection/transition';
import { CommandRunnerTag, runCommand } from '@/background/command-runner';
import {
	CollectionStateStorageLive,
	loadCollectionStateEffect,
} from '@/background/infrastructure/collection-state-storage';
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

const CommandRunnerLive: Layer.Layer<CommandRunnerTag> = Layer.succeed(
	CommandRunnerTag,
	{ run: runCommand },
);

export const BackgroundLive = Layer.mergeAll(
	StateRefLive,
	CommandRunnerLive,
	CollectionStateStorageLive,
	HeartLoggerLive,
);
