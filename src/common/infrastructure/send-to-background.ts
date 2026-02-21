import type { RequestMessage } from "@/common/model/request-message";

/**
 * Send a request to the background script. Returns a Promise that resolves with the response
 * (e.g. GetStateResponse for GetState) or rejects on channel error.
 */
export function sendToBackground(message: RequestMessage): Promise<unknown> {
	return chrome.runtime.sendMessage(message);
}
