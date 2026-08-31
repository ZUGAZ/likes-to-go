import type { CommandRunnerTag } from '@/background/command-runner';
import type { CollectionStateStorageTag } from '@/background/infrastructure/collection-state-storage';
import type { MascotUiSurfaceRefTag } from '@/background/mascot-ui-surface';
import type {
	OverlayHandoffRefTag,
	PopupPortCountRefTag,
} from '@/background/overlay-handoff';
import type { StateRefTag } from '@/background/state-ref';

export type BackgroundEnv =
	| StateRefTag
	| CommandRunnerTag
	| CollectionStateStorageTag
	| MascotUiSurfaceRefTag
	| OverlayHandoffRefTag
	| PopupPortCountRefTag;
