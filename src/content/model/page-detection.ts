import {
	TRACK_CARD,
	TRACK_LIST_CONTAINER,
	isLoadingIndicatorPresent,
	isUserLoggedIn,
} from '@/common/infrastructure/selectors';
import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
import { Data, Effect } from 'effect';

export const WAIT_FOR_TRACK_LIST_CONTAINER_MS = 15_000;

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

function isTrackListEmpty(pageDocument: Document, container: Element): boolean {
	return (
		container.querySelector(TRACK_CARD) === null &&
		!isLoadingIndicatorPresent(pageDocument)
	);
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

export function detectSupportedCollectionPage({
	pageDocument,
	timeoutMs = WAIT_FOR_TRACK_LIST_CONTAINER_MS,
}: {
	readonly pageDocument: Document;
	readonly timeoutMs?: number;
}): Effect.Effect<
	Element,
	UnsupportedCollectionPage | CollectionPageLoginRequired
> {
	return Effect.gen(function* () {
		const root = yield* Effect.tryPromise({
			try: () => waitForTrackListContainer(pageDocument, timeoutMs),
			catch: () =>
				new UnsupportedCollectionPage({
					message: 'Could not find a supported likes list on this page.',
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
					message: 'Your likes list is empty.',
					reason: 'Track list container found but contains no track cards',
				}),
			);
		}

		return root;
	}).pipe(Effect.withLogSpan('detectSupportedCollectionPage'));
}
