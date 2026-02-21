import { describe, expect, it, vi } from "vitest";

import {
	applyGetStateResponse,
	setState,
	setTrackCount,
	setErrorMessage,
	state,
	trackCount,
	errorMessage,
	setToInitial,
} from "@/popup/popup-state";

vi.mock("@/common/infrastructure/chrome-messaging", () => ({
	getState: () =>
		Promise.resolve({ status: "idle" as const, trackCount: 0 }),
	sendToBackground: () => Promise.resolve(),
}));

/**
 * Popup ViewModel state tests. Full Popup component tests with @solidjs/testing-library
 * require the client build of solid-js/web (Vitest in Node resolves server build).
 * Manual testing or a browser test env can cover the View.
 */
describe("Popup state", () => {
	it("applyGetStateResponse maps idle to initial", () => {
		applyGetStateResponse("idle", 0);
		expect(state()).toBe("initial");
		expect(trackCount()).toBe(0);
	});

	it("applyGetStateResponse maps collecting to processing", () => {
		applyGetStateResponse("collecting", 10);
		expect(state()).toBe("processing");
		expect(trackCount()).toBe(10);
	});

	it("applyGetStateResponse maps done and error", () => {
		applyGetStateResponse("done", 5);
		expect(state()).toBe("done");
		applyGetStateResponse("error", 0, "Failed");
		expect(state()).toBe("error");
		expect(errorMessage()).toBe("Failed");
	});

	it("setToInitial resets all signals", () => {
		setState("error");
		setTrackCount(99);
		setErrorMessage("err");
		setToInitial();
		expect(state()).toBe("initial");
		expect(trackCount()).toBe(0);
		expect(errorMessage()).toBeUndefined();
	});
});

describe("Popup view by state (signals only)", () => {
	it("initial state has correct signals for main button and waiting message", () => {
		applyGetStateResponse("idle", 0);
		expect(state()).toBe("initial");
	});

	it("processing state has track count", () => {
		setState("processing");
		setTrackCount(42);
		expect(state()).toBe("processing");
		expect(trackCount()).toBe(42);
	});

	it("done and error states have expected signals", () => {
		setState("done");
		expect(state()).toBe("done");
		setState("error");
		setErrorMessage("Tab failed to load");
		expect(errorMessage()).toBe("Tab failed to load");
	});
});
