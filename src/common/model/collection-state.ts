import type { GetStateResponse } from "@/common/model/request-message";
import type { Track } from "@/common/model/track";

const LIKES_URL = "https://soundcloud.com/you/likes";

// --- State machine (discriminated union) ---

export type CollectionState =
	| { _tag: "Idle" }
	| { _tag: "CollectingRequested" }
	| { _tag: "Collecting"; tabId: number; tracks: readonly Track[] }
	| { _tag: "Done"; tracks: readonly Track[] }
	| { _tag: "Error"; message: string };

// --- Events (input to transitions) ---

export type CollectionEvent =
	| { _tag: "StartCollection" }
	| { _tag: "TabCreated"; tabId: number }
	| { _tag: "TabCreateFailed"; message: string }
	| { _tag: "TracksBatch"; tracks: readonly Track[] }
	| { _tag: "CollectionComplete" }
	| { _tag: "CollectionError"; message: string }
	| { _tag: "CancelCollection" }
	| { _tag: "DownloadExport" }
	| { _tag: "TabComplete"; tabId: number }
	| { _tag: "SendToTabFailed"; message: string }
	| { _tag: "DownloadFailed"; message: string };

// --- Commands (side effects for the orchestrator to run) ---

export type CollectionCommand =
	| { _tag: "CreateTab"; url: string }
	| { _tag: "CloseTab"; tabId: number }
	| { _tag: "SendStartToTab"; tabId: number }
	| { _tag: "DownloadExport"; tracks: readonly Track[] };

export interface TransitionResult {
	state: CollectionState;
	commands: readonly CollectionCommand[];
}

// --- Pure helpers (no mutation) ---

function appendTracksDeduped(
	current: readonly Track[],
	newTracks: readonly Track[],
): Track[] {
	const urlSet = new Set(current.map((t) => t.url.toString()));
	const out: Track[] = [...current]; // not optimal, can be long list of tracks
	for (const t of newTracks) {
		const urlStr = t.url.toString();
		if (!urlSet.has(urlStr)) {
			urlSet.add(urlStr);
			out.push(t);
		}
	}
	return out;
}

// --- Single pure transition (state + event → new state + commands) ---

export function transition(
	current: CollectionState,
	event: CollectionEvent,
): TransitionResult {
	switch (current._tag) {
		case "Idle": {
			if (event._tag === "StartCollection") {
				return {
					state: { _tag: "CollectingRequested" },
					commands: [{ _tag: "CreateTab", url: LIKES_URL }],
				};
			}
			if (event._tag === "DownloadFailed") {
				return {
					state: { _tag: "Error", message: event.message },
					commands: [],
				};
			}
			break;
		}
		case "CollectingRequested": {
			if (event._tag === "TabCreated") {
				return {
					state: {
						_tag: "Collecting",
						tabId: event.tabId,
						tracks: [],
					},
					commands: [],
				};
			}
			if (event._tag === "TabCreateFailed") {
				return {
					state: { _tag: "Error", message: event.message },
					commands: [],
				};
			}
			if (event._tag === "CancelCollection") {
				return { state: { _tag: "Idle" }, commands: [] };
			}
			break;
		}
		case "Collecting": {
			if (event._tag === "TracksBatch") {
				return {
					state: {
						_tag: "Collecting",
						tabId: current.tabId,
						tracks: appendTracksDeduped(current.tracks, event.tracks),
					},
					commands: [],
				};
			}
			if (event._tag === "CollectionComplete") {
				return {
					state: { _tag: "Done", tracks: current.tracks },
					commands: [],
				};
			}
			if (event._tag === "CollectionError") {
				return {
					state: { _tag: "Error", message: event.message },
					commands: [{ _tag: "CloseTab", tabId: current.tabId }],
				};
			}
			if (event._tag === "CancelCollection") {
				return {
					state: { _tag: "Idle" },
					commands: [{ _tag: "CloseTab", tabId: current.tabId }],
				};
			}
			if (event._tag === "TabComplete" && event.tabId === current.tabId) {
				return {
					state: current,
					commands: [{ _tag: "SendStartToTab", tabId: current.tabId }],
				};
			}
			if (event._tag === "SendToTabFailed") {
				return {
					state: { _tag: "Error", message: event.message },
					commands: [{ _tag: "CloseTab", tabId: current.tabId }],
				};
			}
			if (event._tag === "DownloadExport") {
				return {
					state: { _tag: "Idle" },
					commands: [{ _tag: "DownloadExport", tracks: current.tracks }],
				};
			}
			break;
		}
		case "Done": {
			if (event._tag === "DownloadExport") {
				return {
					state: { _tag: "Idle" },
					commands: [{ _tag: "DownloadExport", tracks: current.tracks }],
				};
			}
			if (event._tag === "CancelCollection") {
				return { state: { _tag: "Idle" }, commands: [] };
			}
			break;
		}
		case "Error": {
			if (event._tag === "DownloadFailed") {
				return {
					state: { _tag: "Error", message: event.message },
					commands: [],
				};
			}
			if (event._tag === "CancelCollection") {
				return { state: { _tag: "Idle" }, commands: [] };
			}
			if (event._tag === "StartCollection") {
				return {
					state: { _tag: "CollectingRequested" },
					commands: [{ _tag: "CreateTab", url: LIKES_URL }],
				};
			}
			break;
		}
	}
	// No transition for this (state, event) pair: keep state, no commands
	return { state: current, commands: [] };
}

// --- Map internal state to GetStateResponse (for popup) ---

export function collectionStateToGetStateResponse(
	state: CollectionState,
): GetStateResponse {
	const status =
		state._tag === "Idle"
			? "idle"
			: state._tag === "CollectingRequested" || state._tag === "Collecting"
				? "collecting"
				: state._tag === "Done"
					? "done"
					: "error";
	const trackCount =
		state._tag === "Collecting" || state._tag === "Done"
			? state.tracks.length
			: 0;
	const errorMessage = state._tag === "Error" ? state.message : undefined;
	return {
		status,
		trackCount,
		...(errorMessage !== undefined && { errorMessage }),
	};
}

export const initialCollectionState: CollectionState = { _tag: "Idle" };
