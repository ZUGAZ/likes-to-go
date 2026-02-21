import { createSignal } from "solid-js";

export type PopupState = "initial" | "processing" | "done" | "error";

export const [state, setState] = createSignal<PopupState>("initial");
export const [trackCount, setTrackCount] = createSignal(0);
export const [errorMessage, setErrorMessage] = createSignal<string | undefined>(
	undefined,
);

export function applyGetStateResponse(
	status: "idle" | "collecting" | "done" | "error",
	trackCountFromBg: number,
	errorMessageFromBg?: string,
): void {
	setTrackCount(trackCountFromBg);
	setErrorMessage(errorMessageFromBg);
	if (status === "idle") {
		setState("initial");
	} else if (status === "collecting") {
		setState("processing");
	} else if (status === "done") {
		setState("done");
	} else {
		setState("error");
	}
}

export function setToInitial(): void {
	setState("initial");
	setTrackCount(0);
	setErrorMessage(undefined);
}

export function setToProcessing(): void {
	setState("processing");
	setTrackCount(0);
	setErrorMessage(undefined);
}
