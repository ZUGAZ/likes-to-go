import type { GetStateResponse, RequestMessage } from "@/common/model/request-message";
import {
	collectionStateToGetStateResponse,
	initialCollectionState,
	transition,
	type CollectionCommand,
	type CollectionEvent,
	type CollectionState,
} from "@/common/model/collection-state";
import { buildExportPayload } from "@/common/model/exporter";
import {
	registerRuntimeListener,
	sendToTab,
} from "@/common/infrastructure/chrome-messaging";
import { downloadJson } from "@/common/infrastructure/chrome-downloads";

// Single reference to current state; only updated via transition() in dispatch().
const stateRef: { current: CollectionState } = {
	current: initialCollectionState,
};

function messageToEvent(message: RequestMessage): CollectionEvent | null {
	switch (message._tag) {
		case "StartCollection":
			return { _tag: "StartCollection" };
		case "TracksBatch":
			return { _tag: "TracksBatch", tracks: message.tracks };
		case "CollectionComplete":
			return { _tag: "CollectionComplete" };
		case "CollectionError":
			return { _tag: "CollectionError", message: message.message };
		case "CancelCollection":
			return { _tag: "CancelCollection" };
		case "DownloadExport":
			return { _tag: "DownloadExport" };
		case "GetState":
			return null;
	}
}

async function runCommand(
	cmd: CollectionCommand,
	dispatch: (event: CollectionEvent) => Promise<void>,
): Promise<void> {
	switch (cmd._tag) {
		case "CreateTab": {
			try {
				const tab = await chrome.tabs.create({
					url: cmd.url,
					active: false,
				});
				const tabId = tab.id;
				if (tabId === undefined) {
					await dispatch({ _tag: "TabCreateFailed", message: "Failed to create tab" });
				} else {
					await dispatch({ _tag: "TabCreated", tabId });
				}
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : String(err);
				await dispatch({ _tag: "TabCreateFailed", message });
			}
			break;
		}
		case "CloseTab":
			await chrome.tabs.remove(cmd.tabId);
			break;
		case "SendStartToTab":
			sendToTab(cmd.tabId, { _tag: "StartCollection" }).catch(
				async (err: unknown) => {
					const message = err instanceof Error ? err.message : String(err);
					await dispatch({ _tag: "SendToTabFailed", message });
				},
			);
			break;
		case "DownloadExport": {
			const payload = buildExportPayload({ tracks: [...cmd.tracks] });
			downloadJson(JSON.stringify(payload)).catch(async (err: unknown) => {
				const message = err instanceof Error ? err.message : String(err);
				await dispatch({ _tag: "DownloadFailed", message });
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
	await runCommands(result.commands, dispatch);
}

async function handleMessage(
	message: RequestMessage,
	sender: chrome.runtime.MessageSender,
): Promise<GetStateResponse | undefined> {
	void sender;
	if (message._tag === "GetState") {
		return collectionStateToGetStateResponse(stateRef.current);
	}
	const event = messageToEvent(message);
	if (event !== null) {
		await dispatch(event);
	}
	return undefined;
}

function handleTabComplete(tabId: number): void {
	void dispatch({ _tag: "TabComplete", tabId });
}

export function initBackgroundService(): void {
	chrome.tabs.onUpdated.addListener(
		(id: number, changeInfo: chrome.tabs.OnUpdatedInfo) => {
			if (changeInfo.status === "complete") {
				handleTabComplete(id);
			}
		},
	);
	registerRuntimeListener(handleMessage);
}
