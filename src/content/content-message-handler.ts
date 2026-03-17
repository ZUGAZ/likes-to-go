import { parseRequestMessage } from '@/common/infrastructure/parse-request-message';
import { TRACK_LIST_CONTAINER } from '@/common/infrastructure/selectors';
import { sendToBackgroundEffect } from '@/common/infrastructure/send-to-background';
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
import type { ContentEnv } from '@/content/runtime/content-env';
import { Effect, Either, Exit, Fiber, Runtime } from 'effect';

export interface ContentScriptCtx {
	readonly isValid: boolean;
	readonly onInvalidated: (cb: () => void) => () => void;
}

export function createContentMessageHandler(
	runtime: Runtime.Runtime<ContentEnv>,
	ctx: ContentScriptCtx,
): (
	message: unknown,
	_sender: chrome.runtime.MessageSender,
	sendResponse: (response?: unknown) => void,
) => boolean {
	let fiber: Fiber.RuntimeFiber<CollectionOutcome> | null = null;

	const interuptFiber = () => {
		if (fiber !== null) {
			Runtime.runFork(runtime)(Fiber.interrupt(fiber));
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
			const logStart = Effect.log('StartCollection received');

			interuptFiber();

			const root = document.querySelector(TRACK_LIST_CONTAINER);
			if (root === null) {
				const program = Effect.zipRight(
					Effect.log('content track list not found'),
					sendToBackgroundEffect(
						CollectionErrorRequest({
							message: 'Track list not found on page',
						}),
					),
				);

				void Runtime.runPromise(runtime)(program).then(() => sendResponse());
				return true;
			}

			const pipeline = collectionPipeline.pipe(
				Effect.provide(makeCollectionLive(root)),
			);

			fiber = Runtime.runFork(runtime)(
				logStart.pipe(Effect.zipRight(pipeline)),
			);

			void Runtime.runPromise(runtime)(
				Fiber.await(fiber).pipe(
					Effect.tap((exit) => {
						fiber = null;
						if (Exit.isInterrupted(exit)) {
							return Effect.log('content collection interrupted');
						}
						return Effect.void;
					}),
				),
			).then(() => sendResponse());

			return true;
		}

		if (isCancelCollection(msg)) {
			void Runtime.runPromise(runtime)(
				Effect.log('content CancelCollection received'),
			);
			interuptFiber();
			sendResponse();
			return false;
		}

		return false;
	};
}
