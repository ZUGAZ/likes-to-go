import { catchError } from '@/common/model/catch-error';
import { CollectionTabSelected } from '@/common/model/collection/events/collection-tab-selected';
import { TabCreateFailed } from '@/common/model/collection/events/tab-create-failed';
import { isSoundCloudUrl } from '@/common/model/url/is-soundcloud-url';
import { Effect, flow, Option } from 'effect';
import { get } from 'effect/Struct';

const LIKES_URL = 'https://soundcloud.com/you/likes';

function tabIdToSelected(
	tab: chrome.tabs.Tab,
): Effect.Effect<CollectionTabSelected, TabCreateFailed> {
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
			onSome: (tabId) => Effect.succeed(CollectionTabSelected({ tabId })),
		}),
	)(tab);
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

		if (activeTab !== undefined && isSoundCloudUrl(activeTab.url)) {
			return yield* tabIdToSelected(activeTab);
		}

		const createdTab = yield* createLikesTabEffect;
		return yield* tabIdToSelected(createdTab);
	}).pipe(Effect.withLogSpan('runSelectCollectionTab'));
}
