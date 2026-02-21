import type { RequestMessage } from "@/common/model/request-message";

/**
 * Send a request from background to a specific tab (e.g. content script).
 * Returns a Promise that resolves with the response or rejects on channel error.
 */
export function sendToTab(
	tabId: number,
	message: RequestMessage,
): Promise<unknown> {
	return chrome.tabs.sendMessage(tabId, message);
}
