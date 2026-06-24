import type { CommandRunnerTag } from '@/background/command-runner';
import type { CollectionStateStorageTag } from '@/background/infrastructure/collection-state-storage';
import type { StateRefTag } from '@/background/state-ref';

export type BackgroundEnv =
	| StateRefTag
	| CommandRunnerTag
	| CollectionStateStorageTag;
