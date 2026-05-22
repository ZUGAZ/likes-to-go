import {
	TRACK_CARD,
	TRACK_LIST_CONTAINER,
	isLoadingIndicatorPresent,
	isUserLoggedIn,
} from '@/common/infrastructure/selectors';
import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
import {
	EMPTY_LIKES_LIST_MESSAGE,
	UNSUPPORTED_COLLECTION_PAGE_MESSAGE,
} from '@/content/model/collection-error-messages';
import { Data, Effect } from 'effect';

export const WAIT_FOR_TRACK_LIST_CONTAINER_MS = 5_000;
export const WAIT_FOR_LIST_TO_SETTLE_MS = 5_000;

export class UnsupportedCollectionPage extends Data.TaggedError(
	'UnsupportedCollectionPage',
)<{
	readonly message: string;
	readonly reason: string;
}> {}

export class CollectionPageLoginRequired extends Data.TaggedError(
	'CollectionPageLoginRequired',
)<{
	readonly message: string;
	readonly reason: string;
}> {}

function findTrackListContainer(pageDocument: Document): Element | null {
	return pageDocument.querySelector(TRACK_LIST_CONTAINER);
}

function hasTrackCards(container: Element): boolean {
	return container.querySelector(TRACK_CARD) !== null;
}

function isTrackListEmpty(pageDocument: Document, container: Element): boolean {
	return !hasTrackCards(container) && !isLoadingIndicatorPresent(pageDocument);
}

function isListSettled(pageDocument: Document, container: Element): boolean {
	return hasTrackCards(container) || !isLoadingIndicatorPresent(pageDocument);
}

function waitForTrackListContainer(
	pageDocument: Document,
	timeoutMs: number,
): Promise<Element> {
	const currentRoot = findTrackListContainer(pageDocument);
	if (currentRoot !== null) {
		return Promise.resolve(currentRoot);
	}

	return new Promise((resolve, reject) => {
		const observer = new MutationObserver(() => {
			const root = findTrackListContainer(pageDocument);
			if (root === null) return;

			observer.disconnect();
			window.clearTimeout(timeoutId);
			resolve(root);
		});

		const timeoutId = window.setTimeout(() => {
			observer.disconnect();
			reject(new Error('Track list container did not appear in time'));
		}, timeoutMs);

		observer.observe(pageDocument, {
			childList: true,
			subtree: true,
		});

		const observedRoot = findTrackListContainer(pageDocument);
		if (observedRoot === null) return;

		observer.disconnect();
		window.clearTimeout(timeoutId);
		resolve(observedRoot);
	});
}

function waitForListToSettle(
	pageDocument: Document,
	container: Element,
	timeoutMs: number,
): Promise<void> {
	if (isListSettled(pageDocument, container)) {
		return Promise.resolve();
	}

	return new Promise((resolve, reject) => {
		const observer = new MutationObserver(() => {
			if (!isListSettled(pageDocument, container)) return;

			observer.disconnect();
			window.clearTimeout(timeoutId);
			resolve();
		});

		const timeoutId = window.setTimeout(() => {
			observer.disconnect();
			reject(new Error('Track list did not settle in time'));
		}, timeoutMs);

		observer.observe(pageDocument, {
			childList: true,
			subtree: true,
		});

		if (isListSettled(pageDocument, container)) {
			observer.disconnect();
			window.clearTimeout(timeoutId);
			resolve();
		}
	});
}

export function detectSupportedCollectionPage({
	pageDocument,
	timeoutMs = WAIT_FOR_TRACK_LIST_CONTAINER_MS,
	settleTimeoutMs = WAIT_FOR_LIST_TO_SETTLE_MS,
}: {
	readonly pageDocument: Document;
	readonly timeoutMs?: number;
	readonly settleTimeoutMs?: number;
}): Effect.Effect<
	Element,
	UnsupportedCollectionPage | CollectionPageLoginRequired
> {
	return Effect.gen(function* () {
		const root = yield* Effect.tryPromise({
			try: () => waitForTrackListContainer(pageDocument, timeoutMs),
			catch: () =>
				new UnsupportedCollectionPage({
					message: UNSUPPORTED_COLLECTION_PAGE_MESSAGE,
					reason:
						'Track list container selector did not match any elements before timeout',
				}),
		});

		if (!isUserLoggedIn(pageDocument)) {
			return yield* Effect.fail(
				new CollectionPageLoginRequired({
					message: LOGIN_REQUIRED_MESSAGE,
					reason: 'User nav selector not found in page DOM',
				}),
			);
		}

		if (isTrackListEmpty(pageDocument, root)) {
			return yield* Effect.fail(
				new UnsupportedCollectionPage({
					message: EMPTY_LIKES_LIST_MESSAGE,
					reason: 'Track list container found but contains no track cards',
				}),
			);
		}

		if (!hasTrackCards(root) && isLoadingIndicatorPresent(pageDocument)) {
			yield* Effect.tryPromise({
				try: () => waitForListToSettle(pageDocument, root, settleTimeoutMs),
				catch: () =>
					new UnsupportedCollectionPage({
						message: UNSUPPORTED_COLLECTION_PAGE_MESSAGE,
						reason:
							'Track list loading indicator did not settle before timeout',
					}),
			});
		}

		if (!hasTrackCards(root)) {
			return yield* Effect.fail(
				new UnsupportedCollectionPage({
					message: EMPTY_LIKES_LIST_MESSAGE,
					reason: 'Track list container found but contains no track cards',
				}),
			);
		}

		return root;
	}).pipe(Effect.withLogSpan('detectSupportedCollectionPage'));
}
