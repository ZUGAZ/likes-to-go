import { Schema } from 'effect';

import { CreateTabSchema } from '@/common/model/collection/commands/create-tab';
import { CloseTabSchema } from '@/common/model/collection/commands/close-tab';
import { SendStartToTabSchema } from '@/common/model/collection/commands/send-start-to-tab';
import { SendCancelToTabSchema } from '@/common/model/collection/commands/send-cancel-to-tab';
import { DownloadExportCommandSchema } from '@/common/model/collection/commands/download-export-command';
import { NotifyPopupSchema } from '@/common/model/collection/commands/notify-popup';
import { CheckLoginSchema } from '@/common/model/collection/commands/check-login';

export const CollectionCommandSchema = Schema.Union(
	CreateTabSchema,
	CloseTabSchema,
	SendStartToTabSchema,
	SendCancelToTabSchema,
	DownloadExportCommandSchema,
	NotifyPopupSchema,
	CheckLoginSchema,
);

export type CollectionCommand = Schema.Schema.Type<
	typeof CollectionCommandSchema
>;
