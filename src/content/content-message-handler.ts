import { Either } from "effect";
import { parseRequestMessage } from "@/common/infrastructure/parse-request-message";
import { sendToBackground } from "@/common/infrastructure/send-to-background";
import { TRACK_LIST_CONTAINER } from "@/common/infrastructure/selectors";
import { runCollectionLoop } from "@/content/run-collection-loop";

export function createContentMessageHandler(
	ctx: { isValid: boolean },
	cancelledRef: { current: boolean },
): (
	message: unknown,
	_sender: chrome.runtime.MessageSender,
	sendResponse: (response?: unknown) => void,
) => boolean {
	return (
		message: unknown,
		_sender: chrome.runtime.MessageSender,
		sendResponse: (response?: unknown) => void,
	) => {
		const parsed = parseRequestMessage(message);
		if (Either.isLeft(parsed)) return false;
		const msg = parsed.right;
		if (msg._tag === "StartCollection") {
			console.log("[likes-to-go] content StartCollection received");
			cancelledRef.current = false;
			const root = document.querySelector(TRACK_LIST_CONTAINER);
			if (root === null) {
				console.log("[likes-to-go] content track list not found");
				void sendToBackground({
					_tag: "CollectionError",
					message: "Track list not found on page",
				}).then(() => sendResponse());
				return true;
			}
			void runCollectionLoop(root, cancelledRef, ctx).then(() =>
				sendResponse(),
			);
			return true;
		}
		if (msg._tag === "CancelCollection") {
			cancelledRef.current = true;
			sendResponse();
			return false;
		}
		return false;
	};
}
