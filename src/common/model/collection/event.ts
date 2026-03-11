import { Schema } from 'effect';

import { StartCollectionEventSchema } from '@/common/model/collection/events/start-collection';
import { TabCreatedSchema } from '@/common/model/collection/events/tab-created';
import { TabCreateFailedSchema } from '@/common/model/collection/events/tab-create-failed';
import { TracksBatchEventSchema } from '@/common/model/collection/events/tracks-batch';
import { CollectionCompleteEventSchema } from '@/common/model/collection/events/collection-complete';
import { CollectionErrorEventSchema } from '@/common/model/collection/events/collection-error';
import { CancelCollectionEventSchema } from '@/common/model/collection/events/cancel-collection';
import { DownloadExportEventSchema } from '@/common/model/collection/events/download-export-event';
import { TabCompleteSchema } from '@/common/model/collection/events/tab-complete';
import { SendToTabFailedSchema } from '@/common/model/collection/events/send-to-tab-failed';
import { DownloadFailedSchema } from '@/common/model/collection/events/download-failed';

export const CollectionEventSchema = Schema.Union(
	StartCollectionEventSchema,
	TabCreatedSchema,
	TabCreateFailedSchema,
	TracksBatchEventSchema,
	CollectionCompleteEventSchema,
	CollectionErrorEventSchema,
	CancelCollectionEventSchema,
	DownloadExportEventSchema,
	TabCompleteSchema,
	SendToTabFailedSchema,
	DownloadFailedSchema,
);

export type CollectionEvent = Schema.Schema.Type<typeof CollectionEventSchema>;
