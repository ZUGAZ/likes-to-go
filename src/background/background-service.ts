import type { GetStateResponse } from '@/common/model/get-state-response';
import type { RequestMessage } from '@/common/model/request-message';
import {
	getRequestMessageTagForLog,
	isGetStateRequest,
	isTracksBatch,
	StartCollectionRequest,
} from '@/common/model/request-message';
import { requestMessageToCollectionEvent } from '@/common/model/request-message-to-event';
import type { CollectionState } from '@/common/model/collection-state';
import {
	getCollectionStateTag,
	hasTracks,
} from '@/common/model/collection-state';
import type { CollectionEvent } from '@/common/model/collection-event';
import {
	getCollectionEventTag,
	TabCreated,
	TabCreateFailed,
	TabComplete,
	SendToTabFailed,
	DownloadFailed,
} from '@/common/model/collection-event';
import type { CollectionCommand } from '@/common/model/collection-command';
import {
	isCloseTab,
	isCreateTab,
	isDownloadExportCommand,
	isSendStartToTab,
} from '@/common/model/collection-command';
import {
	collectionStateToGetStateResponse,
	initialCollectionState,
	transition,
} from '@/common/model/collection-transition';
import { buildExportPayload } from '@/common/model/exporter';
import {
	registerRuntimeListener,
	sendToTab,
} from '@/common/infrastructure/chrome-messaging';
import { downloadJson } from '@/common/infrastructure/chrome-downloads';

// Single reference to current state; only updated via transition() in dispatch().
const stateRef: { current: CollectionState } = {
	current: initialCollectionState,
};

async function runCommand(
	cmd: CollectionCommand,
	dispatch: (event: CollectionEvent) => Promise<void>,
): Promise<void> {
	if (isCreateTab(cmd)) {
		console.log('[likes-to-go] background CreateTab', cmd.url);
		try {
			const tab = await chrome.tabs.create({
				url: cmd.url,
				active: false,
			});
			const tabId = tab.id;
			if (tabId === undefined) {
				await dispatch(TabCreateFailed({ message: 'Failed to create tab' }));
			} else {
				await dispatch(TabCreated({ tabId }));
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : String(err);
			await dispatch(TabCreateFailed({ message }));
		}
		return;
	}
	if (isCloseTab(cmd)) {
		await chrome.tabs.remove(cmd.tabId);
		return;
	}
	if (isSendStartToTab(cmd)) {
		console.log('[likes-to-go] background SendStartToTab', cmd.tabId);
		sendToTab(cmd.tabId, StartCollectionRequest()).catch(
			async (err: unknown) => {
				const message = err instanceof Error ? err.message : String(err);
				await dispatch(SendToTabFailed({ message }));
			},
		);
		return;
	}
	if (isDownloadExportCommand(cmd)) {
		console.log('[likes-to-go] background DownloadExport', {
			tracks: cmd.tracks.length,
		});
		const payload = buildExportPayload({ tracks: [...cmd.tracks] });
		downloadJson(JSON.stringify(payload)).catch(async (err: unknown) => {
			const message = err instanceof Error ? err.message : String(err);
			console.error('[likes-to-go] background download failed', message);
			await dispatch(DownloadFailed({ message }));
		});
	}
}

async function runCommands(
	commands: readonly CollectionCommand[],
	dispatch: (event: CollectionEvent) => Promise<void>,
): Promise<void> {
	for (const cmd of commands) {
		await runCommand(cmd, dispatch);
	}
}

async function dispatch(event: CollectionEvent): Promise<void> {
	const result = transition(stateRef.current, event);
	stateRef.current = result.state;
	const stateTag = getCollectionStateTag(stateRef.current);
	const tracksLen = hasTracks(stateRef.current)
		? stateRef.current.tracks.length
		: undefined;
	console.log(
		'[likes-to-go] background dispatch',
		getCollectionEventTag(event),
		'→ state',
		stateTag,
		tracksLen !== undefined ? { tracks: tracksLen } : '',
	);
	await runCommands(result.commands, dispatch);
}

async function handleMessage(
	message: RequestMessage,
	sender: chrome.runtime.MessageSender,
): Promise<GetStateResponse | undefined> {
	void sender;
	if (isGetStateRequest(message)) {
		return collectionStateToGetStateResponse(stateRef.current);
	}
	const batchInfo = isTracksBatch(message)
		? { tracks: message.tracks.length }
		: undefined;
	console.log(
		'[likes-to-go] background received',
		getRequestMessageTagForLog(message),
		batchInfo,
	);
	const event = requestMessageToCollectionEvent(message);
	if (event !== null) {
		await dispatch(event);
	}
	return collectionStateToGetStateResponse(stateRef.current);
}

function handleTabComplete(tabId: number): void {
	void dispatch(TabComplete({ tabId }));
}

export function initBackgroundService(): void {
	chrome.tabs.onUpdated.addListener(
		(id: number, changeInfo: chrome.tabs.OnUpdatedInfo) => {
			if (changeInfo.status === 'complete') {
				handleTabComplete(id);
			}
		},
	);
	registerRuntimeListener(handleMessage);
}
