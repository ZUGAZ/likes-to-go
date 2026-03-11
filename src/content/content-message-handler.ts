import { parseRequestMessage } from '@/common/infrastructure/parse-request-message';
import { TRACK_LIST_CONTAINER } from '@/common/infrastructure/selectors';
import { sendToBackground } from '@/common/infrastructure/send-to-background';
import {
	CollectionErrorRequest,
	isCancelCollection,
	isStartCollection,
} from '@/common/model/request-message';
import { makeCollectionLive } from '@/content/infrastructure/collection-services';
import {
	collectionPipeline,
	type CollectionOutcome,
} from '@/content/model/collection-pipeline';
import { Effect, Either, Exit, Fiber } from 'effect';

export interface ContentScriptCtx {
	readonly isValid: boolean;
	readonly onInvalidated: (cb: () => void) => () => void;
}

export function createContentMessageHandler(
	ctx: ContentScriptCtx,
): (
	message: unknown,
	_sender: chrome.runtime.MessageSender,
	sendResponse: (response?: unknown) => void,
) => boolean {
	let fiber: Fiber.RuntimeFiber<CollectionOutcome> | null = null;

	const interuptFiber = () => {
		if (fiber !== null) {
			Effect.runFork(Fiber.interrupt(fiber));
			fiber = null;
		}
	};

	ctx.onInvalidated(interuptFiber);

	return (
		message: unknown,
		_sender: chrome.runtime.MessageSender,
		sendResponse: (response?: unknown) => void,
	) => {
		const parsed = parseRequestMessage(message);
		if (Either.isLeft(parsed)) return false;
		const msg = parsed.right;

		if (isStartCollection(msg)) {
			console.log('[likes-to-go] content StartCollection received');

			interuptFiber();

			const root = document.querySelector(TRACK_LIST_CONTAINER);
			if (root === null) {
				console.log('[likes-to-go] content track list not found');
				void sendToBackground(
					CollectionErrorRequest({
						message: 'Track list not found on page',
					}),
				).then(() => sendResponse());
				return true;
			}

			const pipeline = collectionPipeline.pipe(
				Effect.provide(makeCollectionLive(root)),
			);

			fiber = Effect.runFork(pipeline);

			void Effect.runPromise(
				Fiber.await(fiber).pipe(
					Effect.tap((exit) => {
						fiber = null;
						if (Exit.isInterrupted(exit)) {
							console.log('[likes-to-go] content collection interrupted');
						}
					}),
				),
			).then(() => sendResponse());

			return true;
		}

		if (isCancelCollection(msg)) {
			console.log('[likes-to-go] content CancelCollection received');
			interuptFiber();
			sendResponse();
			return false;
		}

		return false;
	};
}
