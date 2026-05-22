import { parseRequestMessage } from '@/common/infrastructure/parse-request-message';
import {
	TRACK_CARD,
	TRACK_LIST_CONTAINER,
	isLoadingIndicatorPresent,
	isUserLoggedIn,
} from '@/common/infrastructure/selectors';
import { sendToBackgroundEffect } from '@/common/infrastructure/send-to-background';
import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
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
import type { ContentEnv } from '@/content/runtime/content-env';
import { Effect, Either, Exit, Fiber, Runtime } from 'effect';

const WAIT_FOR_TRACK_LIST_CONTAINER_MS = 15_000;

/**
 * Uses URL as a hint to choose between two failure messages after the DOM
 * gate fails — the decision to stop is always DOM-based, not URL-based.
 */
function unsupportedPageMessage(): string {
	const isKnownCollectionPath = /\/you\/(likes|tracks|reposts|playlists)/.test(
		location.pathname,
	);
	return isKnownCollectionPath
		? 'Could not find your likes list — the page structure may have changed.'
		: "This SoundCloud page doesn't have a likes list.";
}

/**
 * Returns true when the container exists but has no track cards and the
 * loading spinner is absent — meaning the list is genuinely empty rather
 * than still loading.
 */
function isTrackListEmpty(container: Element): boolean {
	return (
		container.querySelector(TRACK_CARD) === null &&
		!isLoadingIndicatorPresent(document)
	);
}

export interface ContentScriptCtx {
	readonly isValid: boolean;
	readonly onInvalidated: (cb: () => void) => () => void;
}

function findTrackListContainer(): Element | null {
	return document.querySelector(TRACK_LIST_CONTAINER);
}

function waitForTrackListContainer(): Promise<Element> {
	const currentRoot = findTrackListContainer();
	if (currentRoot !== null) {
		return Promise.resolve(currentRoot);
	}

	return new Promise((resolve, reject) => {
		const observer = new MutationObserver(() => {
			const root = findTrackListContainer();
			if (root === null) return;

			observer.disconnect();
			window.clearTimeout(timeoutId);
			resolve(root);
		});

		const timeoutId = window.setTimeout(() => {
			observer.disconnect();
			reject(new Error('Track list container did not appear in time'));
		}, WAIT_FOR_TRACK_LIST_CONTAINER_MS);

		observer.observe(document, {
			childList: true,
			subtree: true,
		});

		const observedRoot = findTrackListContainer();
		if (observedRoot === null) return;

		observer.disconnect();
		window.clearTimeout(timeoutId);
		resolve(observedRoot);
	});
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
			interuptFiber();

			const program = Effect.gen(function* () {
				yield* Effect.log('StartCollection received');

				const root = yield* Effect.tryPromise({
					try: waitForTrackListContainer,
					catch: () =>
						CollectionErrorRequest({
							message: unsupportedPageMessage(),
							reason:
								'Track list container selector did not match any elements before timeout',
						}),
				}).pipe(
					Effect.tapError((request) =>
						Effect.log('content track list not found').pipe(
							Effect.zipRight(sendToBackgroundEffect(request)),
							Effect.catchAll(() => Effect.void),
						),
					),
					Effect.mapError((request) =>
						OutcomeError({ message: request.message }),
					),
				);

				if (isTrackListEmpty(root)) {
					const request = CollectionErrorRequest({
						message: 'Your likes list is empty.',
						reason: 'Track list container found but contains no track cards',
					});

					return yield* Effect.log('content empty likes list').pipe(
						Effect.zipRight(sendToBackgroundEffect(request)),
						Effect.as(OutcomeError({ message: request.message })),
						Effect.catchAll(() =>
							Effect.succeed(OutcomeError({ message: request.message })),
						),
					);
				}

				if (!isUserLoggedIn(document)) {
					const request = LoginRequiredRequest({
						message: LOGIN_REQUIRED_MESSAGE,
						reason: 'User nav selector not found in page DOM',
					});

					return yield* Effect.log(
						'content login check failed: user nav not found',
					).pipe(
						Effect.zipRight(sendToBackgroundEffect(request)),
						Effect.as(OutcomeError({ message: request.message })),
						Effect.catchAll(() =>
							Effect.succeed(OutcomeError({ message: request.message })),
						),
					);
				}

				return yield* collectionPipeline.pipe(
					Effect.provide(makeCollectionLive(root)),
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
	};
}
