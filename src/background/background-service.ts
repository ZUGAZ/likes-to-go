import type {
	GetStateResponse,
	RequestMessage,
} from '@/common/model/request-message';
import {
	collectionStateToGetStateResponse,
	initialCollectionState,
	transition,
	type CollectionCommand,
	type CollectionEvent,
	type CollectionState,
	StartCollection,
	TracksBatch,
	CollectionComplete,
	CollectionError,
	CancelCollection,
	DownloadExport,
	TabCreated,
	TabCreateFailed,
	TabComplete,
	SendToTabFailed,
	DownloadFailed,
} from '@/common/model/collection-state';
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

function messageToEvent(message: RequestMessage): CollectionEvent | null {
	switch (message._tag) {
		case 'StartCollection':
			return StartCollection();
		case 'TracksBatch':
			return TracksBatch({ tracks: message.tracks });
		case 'CollectionComplete':
			return CollectionComplete();
		case 'CollectionError':
			return CollectionError({ message: message.message });
		case 'CancelCollection':
			return CancelCollection();
		case 'DownloadExport':
			return DownloadExport();
		case 'GetState':
			return null;
	}
}

async function runCommand(
	cmd: CollectionCommand,
	dispatch: (event: CollectionEvent) => Promise<void>,
): Promise<void> {
	switch (cmd._tag) {
		case 'CreateTab': {
			console.log('[likes-to-go] background CreateTab', cmd.url);
			try {
				const tab = await chrome.tabs.create({
					url: cmd.url,
					active: false,
				});
				const tabId = tab.id;
				if (tabId === undefined) {
					await dispatch(
						TabCreateFailed({ message: 'Failed to create tab' }),
					);
				} else {
					await dispatch(TabCreated({ tabId }));
				}
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : String(err);
				await dispatch(TabCreateFailed({ message }));
			}
			break;
		}
		case 'CloseTab':
			await chrome.tabs.remove(cmd.tabId);
			break;
		case 'SendStartToTab':
			console.log('[likes-to-go] background SendStartToTab', cmd.tabId);
			sendToTab(cmd.tabId, StartCollection()).catch(
				async (err: unknown) => {
					const message = err instanceof Error ? err.message : String(err);
					await dispatch(SendToTabFailed({ message }));
				},
			);
			break;
		case 'DownloadExport': {
			console.log('[likes-to-go] background DownloadExport', {
				tracks: cmd.tracks.length,
			});
			const payload = buildExportPayload({ tracks: [...cmd.tracks] });
			downloadJson(JSON.stringify(payload)).catch(async (err: unknown) => {
				const message = err instanceof Error ? err.message : String(err);
				console.error('[likes-to-go] background download failed', message);
				await dispatch(DownloadFailed({ message }));
			});
			break;
		}
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
	const stateTag = stateRef.current._tag;
	const tracksLen =
		stateTag === 'Collecting' || stateTag === 'Done'
			? stateRef.current.tracks.length
			: undefined;
	console.log(
		'[likes-to-go] background dispatch',
		event._tag,
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
	if (message._tag === 'GetState') {
		return collectionStateToGetStateResponse(stateRef.current);
	}
	const batchInfo =
		message._tag === 'TracksBatch'
			? { tracks: message.tracks.length }
			: undefined;
	console.log('[likes-to-go] background received', message._tag, batchInfo);
	const event = messageToEvent(message);
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
