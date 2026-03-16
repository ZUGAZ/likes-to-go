import {
	dispatchEffect,
	type BackgroundEnv,
} from '@/background/background-dispatch';
import {
	runCloseTab,
	runCreateTab,
	runDownloadExport,
	runSendCancelToTab,
	runSendStartToTab,
} from '@/background/commands';
import type { CollectionCommand } from '@/common/model/collection/command';
import { isCloseTab } from '@/common/model/collection/commands/close-tab';
import { isCreateTab } from '@/common/model/collection/commands/create-tab';
import { isDownloadExportCommand } from '@/common/model/collection/commands/download-export-command';
import { isNotifyPopup } from '@/common/model/collection/commands/notify-popup';
import { isSendCancelToTab } from '@/common/model/collection/commands/send-cancel-to-tab';
import { isSendStartToTab } from '@/common/model/collection/commands/send-start-to-tab';
import { Context, Effect } from 'effect';
import { runNotifyPopup } from './commands/run-notify-popup';

/**
 * CommandRunner runs collection commands (Chrome tabs, sendToTab, download).
 * It maps command success / failure into CollectionEvents and dispatches them.
 */
export interface CommandRunner {
	readonly run: (
		cmd: CollectionCommand,
	) => Effect.Effect<void, never, BackgroundEnv>;
}

export class CommandRunnerTag extends Context.Tag('CommandRunner')<
	CommandRunnerTag,
	CommandRunner
>() {}

export function runCommand(
	cmd: CollectionCommand,
): Effect.Effect<void, never, BackgroundEnv> {
	return Effect.gen(function* () {
		yield* Effect.log('running command', cmd._tag);

		if (isCreateTab(cmd)) {
			yield* runCreateTab(cmd.url).pipe(
				Effect.matchEffect({
					onFailure: dispatchEffect,
					onSuccess: dispatchEffect,
				}),
			);
		} else if (isCloseTab(cmd)) {
			yield* runCloseTab(cmd.tabId);
		} else if (isSendCancelToTab(cmd)) {
			yield* runSendCancelToTab(cmd.tabId).pipe(
				Effect.catchAll(dispatchEffect),
			);
		} else if (isSendStartToTab(cmd)) {
			yield* runSendStartToTab(cmd.tabId).pipe(Effect.catchAll(dispatchEffect));
		} else if (isDownloadExportCommand(cmd)) {
			yield* runDownloadExport(cmd.tracks).pipe(
				Effect.matchEffect({
					onFailure: dispatchEffect,
					onSuccess: dispatchEffect,
				}),
			);
		} else if (isNotifyPopup(cmd)) {
			yield* runNotifyPopup(cmd.state);
		}
	}).pipe(Effect.withLogSpan('runCommand'));
}
