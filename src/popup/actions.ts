import {
	applyGetStateResponse,
	setToInitial,
	setToProcessing,
} from "@/popup/popup-state";
import { getState, sendToBackground } from "@/common/infrastructure/chrome-messaging";

const POLL_INTERVAL_MS = 500;

let pollingId: ReturnType<typeof setInterval> | undefined;

function stopPolling(): void {
	if (pollingId !== undefined) {
		clearInterval(pollingId);
		pollingId = undefined;
	}
}

function startPolling(): void {
	stopPolling();
	pollingId = setInterval(() => {
		getState()
			.then((res) => {
				applyGetStateResponse(
					res.status,
					res.trackCount,
					res.errorMessage,
				);
				if (res.status !== "collecting") {
					stopPolling();
				}
			})
			.catch(() => {
				stopPolling();
			});
	}, POLL_INTERVAL_MS);
}

export async function startCollection(): Promise<void> {
	await sendToBackground({ _tag: "StartCollection" });
	setToProcessing();
	startPolling();
}

export async function cancelCollection(): Promise<void> {
	stopPolling();
	await sendToBackground({ _tag: "CancelCollection" });
	setToInitial();
}

export async function download(): Promise<void> {
	await sendToBackground({ _tag: "DownloadExport" });
	setToInitial();
}

/** Sync popup state from background (e.g. when popup opens). */
export async function syncStateFromBackground(): Promise<void> {
	const res = await getState();
	applyGetStateResponse(res.status, res.trackCount, res.errorMessage);
}
