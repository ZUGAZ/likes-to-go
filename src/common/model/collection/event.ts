import { Schema } from 'effect';

import { StartCollectionEventSchema } from '@/common/model/collection/events/start-collection';
import { TabCreatedSchema } from '@/common/model/collection/events/tab-created';
import { TabCreateFailedSchema } from '@/common/model/collection/events/tab-create-failed';
import { TracksBatchEventSchema } from '@/common/model/collection/events/tracks-batch';
import { CollectionCompleteEventSchema } from '@/common/model/collection/events/collection-complete';
import { CollectionErrorEventSchema } from '@/common/model/collection/events/collection-error';
import { CancelCollectionEventSchema } from '@/common/model/collection/events/cancel-collection';
import { DownloadExportEventSchema } from '@/common/model/collection/events/download-export-event';
import { SendToTabFailedSchema } from '@/common/model/collection/events/send-to-tab-failed';
import { DownloadFailedSchema } from '@/common/model/collection/events/download-failed';
import { LoginVerifiedEventSchema } from '@/common/model/collection/events/login-verified';
import { LoginRequiredEventSchema } from '@/common/model/collection/events/login-required';
import { GetStateRequestedEventSchema } from '@/common/model/collection/events/get-state-requested';
import { CollectionTabSelectedSchema } from '@/common/model/collection/events/collection-tab-selected';
import { SourceSelectedEventSchema } from '@/common/model/collection/events/source-selected';
import { CollectionVisibilityPausedEventSchema } from '@/common/model/collection/events/collection-visibility-paused';
import { CollectionVisibilityResumedEventSchema } from '@/common/model/collection/events/collection-visibility-resumed';

export const CollectionEventSchema = Schema.Union(
	StartCollectionEventSchema,
	TabCreatedSchema,
	TabCreateFailedSchema,
	TracksBatchEventSchema,
	CollectionCompleteEventSchema,
	CollectionErrorEventSchema,
	CancelCollectionEventSchema,
	DownloadExportEventSchema,
	SendToTabFailedSchema,
	DownloadFailedSchema,
	LoginVerifiedEventSchema,
	LoginRequiredEventSchema,
	GetStateRequestedEventSchema,
	CollectionTabSelectedSchema,
	SourceSelectedEventSchema,
	CollectionVisibilityPausedEventSchema,
	CollectionVisibilityResumedEventSchema,
);

export type CollectionEvent = Schema.Schema.Type<typeof CollectionEventSchema>;
