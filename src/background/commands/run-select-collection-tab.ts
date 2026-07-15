import { catchError } from '@/common/model/catch-error';
import { CollectionTabSelected } from '@/common/model/collection/events/collection-tab-selected';
import { TabCreateFailed } from '@/common/model/collection/events/tab-create-failed';
import { isSoundCloudUrl } from '@/common/model/url/is-soundcloud-url';
import { Effect, flow, Option } from 'effect';
import { get } from 'effect/Struct';

const LIKES_URL = 'https://soundcloud.com/you/likes';

/** Chrome may return `url: ''` before navigation; `??` does not fall through. */
function resolveTabUrl(
	tab: Pick<chrome.tabs.Tab, 'url' | 'pendingUrl'>,
): string | undefined {
	const candidates = [tab.url, tab.pendingUrl];
	return candidates.find(
		(candidate): candidate is string =>
			candidate !== undefined && candidate.length > 0,
	);
}

function requireTabId(
	tab: chrome.tabs.Tab,
): Effect.Effect<number, TabCreateFailed> {
	return flow(
		get('id'),
		Option.fromNullable,
		Option.match({
			onNone: () =>
				Effect.fail(
					TabCreateFailed({
						message: 'Could not select the collection tab',
						reason: 'Selected tab did not have an id',
					}),
				),
			onSome: Effect.succeed,
		}),
	)(tab);
}

function existingTabToSelected(
	tab: chrome.tabs.Tab,
): Effect.Effect<CollectionTabSelected, TabCreateFailed> {
	const sourceUrlEffect = Option.fromNullable(resolveTabUrl(tab)).pipe(
		Option.filter(isSoundCloudUrl),
		Option.match({
			onNone: () =>
				Effect.fail(
					TabCreateFailed({
						message: 'Could not select the collection tab',
						reason: 'Selected tab did not have a SoundCloud URL',
					}),
				),
			onSome: Effect.succeed,
		}),
	);

	return Effect.gen(function* () {
		const tabId = yield* requireTabId(tab);
		const sourceUrl = yield* sourceUrlEffect;
		return CollectionTabSelected({ sourceUrl, tabId });
	});
}

export function runSelectCollectionTab(): Effect.Effect<
	CollectionTabSelected,
	TabCreateFailed
> {
	const queryActiveTabEffect = Effect.tryPromise({
		try: () =>
			chrome.tabs.query({
				active: true,
				currentWindow: true,
			}),
		catch: catchError(
			TabCreateFailed,
			'Could not select the active browser tab',
		),
	});

	const createLikesTabEffect = Effect.tryPromise({
		try: () =>
			chrome.tabs.create({
				url: LIKES_URL,
				active: true,
			}),
		catch: catchError(TabCreateFailed, 'Could not open the likes page'),
	});

	return Effect.gen(function* () {
		yield* Effect.log('background SelectCollectionTab');

		const activeTabs = yield* queryActiveTabEffect;
		const activeTab = activeTabs[0];
		const activeTabUrl =
			activeTab === undefined ? undefined : resolveTabUrl(activeTab);

		if (activeTab !== undefined && isSoundCloudUrl(activeTabUrl)) {
			return yield* existingTabToSelected(activeTab);
		}

		const createdTab = yield* createLikesTabEffect;
		const tabId = yield* requireTabId(createdTab);
		return CollectionTabSelected({ sourceUrl: LIKES_URL, tabId });
	}).pipe(Effect.withLogSpan('runSelectCollectionTab'));
}
