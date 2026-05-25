import { parseRequestMessage } from '@/common/infrastructure/parse-request-message';
import { sendToBackgroundEffect } from '@/common/infrastructure/send-to-background';
import {
	CollectionErrorRequest,
	LoginRequiredRequest,
	isCancelCollection,
	isStartCollection,
} from '@/common/model/request-message';
import { makeCollectionLive } from '@/content/infrastructure/collection-services';
import {
	collectionPipeline,
	type CollectionOutcome,
	OutcomeError,
} from '@/content/model/collection-pipeline';
import {
	CollectionPageLoginRequired,
	UnsupportedCollectionPage,
	detectSupportedCollectionPage,
} from '@/content/model/page-detection';
import type { ContentEnv } from '@/content/runtime/content-env';
import { Effect, Either, Exit, Fiber, Runtime } from 'effect';

export interface ContentScriptCtx {
	readonly isValid: boolean;
	readonly onInvalidated: (cb: () => void) => () => void;
}

type DetectionFailureRequest =
	| ReturnType<typeof CollectionErrorRequest>
	| ReturnType<typeof LoginRequiredRequest>;

function pageDetectionErrorToRequest(
	error: UnsupportedCollectionPage | CollectionPageLoginRequired,
): DetectionFailureRequest {
	if (error instanceof CollectionPageLoginRequired) {
		return LoginRequiredRequest({
			message: error.message,
			reason: error.reason,
		});
	}

	return CollectionErrorRequest({
		message: error.message,
		reason: error.reason,
	});
}

function reportDetectionFailure(
	request: DetectionFailureRequest,
): Effect.Effect<CollectionOutcome> {
	return Effect.log('content page detection failed', request.reason).pipe(
		Effect.zipRight(sendToBackgroundEffect(request)),
		Effect.as(OutcomeError({ message: request.message })),
		Effect.catchAll(() =>
			Effect.succeed(OutcomeError({ message: request.message })),
		),
	);
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
		return Either.match(parseRequestMessage(message), {
			onLeft: () => false,
			onRight: (msg) => {
				if (isStartCollection(msg)) {
					interuptFiber();

					const program = Effect.gen(function* () {
						yield* Effect.log('StartCollection received');

						return yield* detectSupportedCollectionPage({
							pageDocument: document,
						}).pipe(
							Effect.matchEffect({
								onFailure: (error) =>
									reportDetectionFailure(pageDetectionErrorToRequest(error)),
								onSuccess: ({ root, layoutContext }) =>
									collectionPipeline.pipe(
										Effect.provide(makeCollectionLive(root, layoutContext)),
									),
							}),
						);
					}).pipe(Effect.catchAll(Effect.succeed));

					fiber = Runtime.runFork(runtime)(program);

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
			},
		});
	};
}
