import type { CheckLogin } from '@/common/model/collection/commands/check-login';
import type { CheckSource } from '@/common/model/collection/commands/check-source';
import type { CloseTab } from '@/common/model/collection/commands/close-tab';
import type { CreateTab } from '@/common/model/collection/commands/create-tab';
import type { DownloadExportCommand } from '@/common/model/collection/commands/download-export-command';
import type { NotifyPopup } from '@/common/model/collection/commands/notify-popup';
import type { SelectCollectionTab } from '@/common/model/collection/commands/select-collection-tab';
import type { SendCancelToTab } from '@/common/model/collection/commands/send-cancel-to-tab';
import type { SendStartToTab } from '@/common/model/collection/commands/send-start-to-tab';

export type CollectionCommand =
	| CreateTab
	| CloseTab
	| SendStartToTab
	| SendCancelToTab
	| DownloadExportCommand
	| NotifyPopup
	| CheckLogin
	| CheckSource
	| SelectCollectionTab;
