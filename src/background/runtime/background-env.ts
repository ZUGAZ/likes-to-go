import type { CommandRunnerTag } from '@/background/command-runner';
import type { ContentCommandsTag } from '@/background/content-commands';
import type { DispatchLaneTag } from '@/background/dispatch-lane';
import type { CollectionStateStorageTag } from '@/background/infrastructure/collection-state-storage';
import type { MascotUiSurfaceRefTag } from '@/background/mascot-ui-surface';
import type {
	OverlayHandoffRefTag,
	PopupPresenceRefTag,
} from '@/background/overlay-handoff';
import type {
	CollectionStateHydratedTag,
	StateRefTag,
} from '@/background/state-ref';

export type BackgroundEnv =
	| StateRefTag
	| CollectionStateHydratedTag
	| CommandRunnerTag
	| CollectionStateStorageTag
	| MascotUiSurfaceRefTag
	| OverlayHandoffRefTag
	| PopupPresenceRefTag
	| DispatchLaneTag
	| ContentCommandsTag;
