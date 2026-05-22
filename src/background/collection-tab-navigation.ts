import { dispatchEffect } from '@/background/background-dispatch';
import type { BackgroundEnv } from '@/background/runtime/background-env';
import { StateRefTag } from '@/background/state-ref';
import {
	COLLECTION_SOURCE_INVALIDATED_MESSAGE,
	CollectionSourceInvalidated,
} from '@/common/model/collection/events/collection-source-invalidated';
import { isCollecting } from '@/common/model/collection/states/collecting';
import { isPaused } from '@/common/model/collection/states/paused';
import { parseUrl } from '@/common/model/url/parse-url';
import { Effect, Ref } from 'effect';

function normalizeUrl(rawUrl: string): string | undefined {
	return parseUrl(rawUrl)?.toString();
}

function didNavigateAwayFromSelectedUrl(
	selectedUrl: string,
	navigatedUrl: string,
): boolean {
	const selected = normalizeUrl(selectedUrl);
	const navigated = normalizeUrl(navigatedUrl);
	return (
		selected === undefined || navigated === undefined || selected !== navigated
	);
}

export function handleCollectionTabNavigationEffect(
	tabId: number,
	navigatedUrl: string,
): Effect.Effect<void, never, BackgroundEnv> {
	return Effect.gen(function* () {
		const ref = yield* StateRefTag;
		const state = yield* Ref.get(ref);

		if (!isCollecting(state) && !isPaused(state)) return;
		if (state.tabId !== tabId) return;
		if (!didNavigateAwayFromSelectedUrl(state.sourceUrl, navigatedUrl)) return;

		yield* dispatchEffect(
			CollectionSourceInvalidated({
				message: COLLECTION_SOURCE_INVALIDATED_MESSAGE,
				navigatedUrl,
				reason: `Collection tab navigated from ${state.sourceUrl} to ${navigatedUrl}`,
				selectedUrl: state.sourceUrl,
				tabId,
			}),
		);
	}).pipe(Effect.withLogSpan('handleCollectionTabNavigation'));
}
