import { createContentMessageHandler } from "@/content/content-message-handler";

export function initContentScript(ctx: { isValid: boolean }): void {
	const cancelledRef = { current: false };
	chrome.runtime.onMessage.addListener(createContentMessageHandler(ctx, cancelledRef));
}
