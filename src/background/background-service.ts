import type {
	CollectionStatus,
	GetStateResponse,
	RequestMessage,
} from "@/common/model/request-message";
import type { Track } from "@/common/model/track";
import {
	registerRuntimeListener,
	sendToTab,
} from "@/common/infrastructure/chrome-messaging";
import { downloadJson } from "@/common/infrastructure/chrome-downloads";
import { buildExportPayload } from "@/common/model/exporter";

const LIKES_URL = "https://soundcloud.com/you/likes";

interface State {
	status: CollectionStatus;
	tracks: Track[];
	tabId: number | null;
	errorMessage: string | undefined;
}

const state: State = {
	status: "idle",
	tracks: [],
	tabId: null,
	errorMessage: undefined,
};

function appendTracksDeduped(newTracks: readonly Track[]): void {
	const urlSet = new Set(state.tracks.map((t) => t.url.toString()));
	for (const t of newTracks) {
		const urlStr = t.url.toString();
		if (!urlSet.has(urlStr)) {
			state.tracks.push(t);
			urlSet.add(urlStr);
		}
	}
}

function closeTabIfSet(): void {
	if (state.tabId !== null) {
		void chrome.tabs.remove(state.tabId);
		state.tabId = null;
	}
}

function resetToIdle(): void {
	state.tracks = [];
	state.tabId = null;
	state.errorMessage = undefined;
	state.status = "idle";
}

async function handleStartCollection(): Promise<undefined> {
	state.status = "collecting";
	state.tracks = [];
	state.errorMessage = undefined;
	const tab = await chrome.tabs.create({
		url: LIKES_URL,
		active: false,
	});
	const tabId = tab.id;
	if (tabId === undefined) {
		state.status = "error";
		state.errorMessage = "Failed to create tab";
		return undefined;
	}
	state.tabId = tabId;
	return undefined;
}

function handleTabComplete(tabId: number): void {
	if (state.tabId !== tabId || state.status !== "collecting") return;
	sendToTab(tabId, { _tag: "StartCollection" }).catch((err: unknown) => {
		state.status = "error";
		state.errorMessage = err instanceof Error ? err.message : String(err);
		state.tabId = null;
	});
}

async function handleMessage(
	message: RequestMessage,
	sender: chrome.runtime.MessageSender,
): Promise<GetStateResponse | undefined> {
	void sender; // Required by registerRuntimeListener signature; not used by this handler.
	switch (message._tag) {
		case "StartCollection":
			await handleStartCollection();
			return undefined;
		case "TracksBatch":
			appendTracksDeduped(message.tracks);
			return undefined;
		case "CollectionComplete":
			state.status = "done";
			return undefined;
		case "CollectionError":
			state.status = "error";
			state.errorMessage = message.message;
			closeTabIfSet();
			return undefined;
		case "CancelCollection":
			closeTabIfSet();
			resetToIdle();
			return undefined;
		case "DownloadExport": {
			const payload = buildExportPayload({ tracks: state.tracks });
			downloadJson(JSON.stringify(payload)).catch((err: unknown) => {
				state.status = "error";
				state.errorMessage = err instanceof Error ? err.message : String(err);
			});
			resetToIdle();
			return undefined;
		}
		case "GetState": {
			const res: GetStateResponse = {
				status: state.status,
				trackCount: state.tracks.length,
				...(state.errorMessage !== undefined && {
					errorMessage: state.errorMessage,
				}),
			};
			return res;
		}
	}
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
