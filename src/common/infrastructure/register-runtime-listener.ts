import { Either } from "effect";
import type { MessageResponse, RequestMessage } from "@/common/model/request-message";
import { parseRequestMessage } from "@/common/infrastructure/parse-request-message";

/**
 * Register the runtime message listener (call once from background script, synchronously at top level).
 * Validates incoming messages; invalid payloads get a typed error response. Async handler supported
 * via return true + sendResponse from Promise.
 */
export function registerRuntimeListener(
	handler: (
		message: RequestMessage,
		sender: chrome.runtime.MessageSender,
	) => Promise<MessageResponse>,
): void {
	chrome.runtime.onMessage.addListener(
		(
			message: unknown,
			sender: chrome.runtime.MessageSender,
			sendResponse: (response?: MessageResponse) => void,
		) => {
			const parsed = parseRequestMessage(message);
			if (Either.isLeft(parsed)) {
				sendResponse({
					status: "error",
					trackCount: 0,
					errorMessage: parsed.left.reason,
				});
				return;
			}
			Promise.resolve(handler(parsed.right, sender))
				.then(sendResponse)
				.catch((err: unknown) => {
					sendResponse({
						status: "error",
						trackCount: 0,
						errorMessage: err instanceof Error ? err.message : String(err),
					});
				});
			return true; // keep channel open for async response
		},
	);
}
