import type { CancelCollection } from '@/common/model/collection/events/cancel-collection';
import type { CollectionComplete } from '@/common/model/collection/events/collection-complete';
import type { CollectionError } from '@/common/model/collection/events/collection-error';
import type { CollectionSourceInvalidated } from '@/common/model/collection/events/collection-source-invalidated';
import type { CollectionTabSelected } from '@/common/model/collection/events/collection-tab-selected';
import type { CollectionVisibilityPaused } from '@/common/model/collection/events/collection-visibility-paused';
import type { CollectionVisibilityResumed } from '@/common/model/collection/events/collection-visibility-resumed';
import type { DownloadExport } from '@/common/model/collection/events/download-export-event';
import type { DownloadFailed } from '@/common/model/collection/events/download-failed';
import type { GetStateRequested } from '@/common/model/collection/events/get-state-requested';
import type { LoginRequired } from '@/common/model/collection/events/login-required';
import type { LoginVerified } from '@/common/model/collection/events/login-verified';
import type { SendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';
import type { SourceSelected } from '@/common/model/collection/events/source-selected';
import type { StartCollection } from '@/common/model/collection/events/start-collection';
import type { TabCreateFailed } from '@/common/model/collection/events/tab-create-failed';
import type { TabCreated } from '@/common/model/collection/events/tab-created';
import type { TracksBatch } from '@/common/model/collection/events/tracks-batch';

export type CollectionEvent =
	| StartCollection
	| TabCreated
	| TabCreateFailed
	| TracksBatch
	| CollectionComplete
	| CollectionError
	| CancelCollection
	| DownloadExport
	| SendToTabFailed
	| DownloadFailed
	| LoginVerified
	| LoginRequired
	| GetStateRequested
	| CollectionTabSelected
	| SourceSelected
	| CollectionVisibilityPaused
	| CollectionVisibilityResumed
	| CollectionSourceInvalidated;
