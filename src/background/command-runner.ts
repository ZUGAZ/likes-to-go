import { Context, Effect } from 'effect';
import type { CollectionCommand } from '@/common/model/collection';
import {
	isCreateTab,
	isCloseTab,
	isDownloadExportCommand,
	isSendCancelToTab,
	isSendStartToTab,
} from '@/common/model/collection';
import {
	dispatchEffect,
	type BackgroundEnv,
} from '@/background/background-dispatch';
import {
	runCreateTab,
	runCloseTab,
	runDownloadExport,
	runSendCancelToTab,
	runSendStartToTab,
} from '@/background/commands';

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
		if (isCreateTab(cmd)) {
			console.log('[likes-to-go] background CreateTab', cmd.url);
			yield* runCreateTab(cmd.url).pipe(
				Effect.matchEffect({
					onFailure: dispatchEffect,
					onSuccess: dispatchEffect,
				}),
			);
			return;
		}

		if (isCloseTab(cmd)) {
			yield* runCloseTab(cmd.tabId);
			return;
		}

		if (isSendCancelToTab(cmd)) {
			console.log('[likes-to-go] background SendCancelToTab', cmd.tabId);
			yield* runSendCancelToTab(cmd.tabId).pipe(
				Effect.catchAll(dispatchEffect),
			);
			return;
		}

		if (isSendStartToTab(cmd)) {
			console.log('[likes-to-go] background SendStartToTab', cmd.tabId);
			yield* runSendStartToTab(cmd.tabId).pipe(Effect.catchAll(dispatchEffect));
			return;
		}

		if (isDownloadExportCommand(cmd)) {
			console.log('[likes-to-go] background DownloadExport', {
				tracks: cmd.tracks.length,
			});
			yield* runDownloadExport(cmd.tracks).pipe(
				Effect.matchEffect({
					onFailure: dispatchEffect,
					onSuccess: dispatchEffect,
				}),
			);
			return;
		}

		return;
	});
}
