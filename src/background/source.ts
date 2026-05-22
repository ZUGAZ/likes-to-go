import { isSoundCloudUrl } from '@/common/model/url/is-soundcloud-url';
import { DEFAULT_SOURCE, type Source } from '@/common/model/source';
import { errorToReason } from '@/common/model/error-to-reason';
import { Data, Effect } from 'effect';

class SourceCheckFailed extends Data.TaggedError('SourceCheckFailed')<{
	readonly message: string;
	readonly reason: string;
}> {}

function sourceFromUrl(rawUrl: string | undefined): Source {
	return isSoundCloudUrl(rawUrl) ? 'active-soundcloud-tab' : DEFAULT_SOURCE;
}

export function getPopupSource(): Effect.Effect<Source> {
	return Effect.tryPromise({
		try: () =>
			chrome.tabs.query({
				active: true,
				currentWindow: true,
			}),
		catch: (err: unknown) =>
			new SourceCheckFailed({
				message: 'Could not read the active browser tab',
				reason: errorToReason(err),
			}),
	}).pipe(
		Effect.map((tabs) => sourceFromUrl(tabs[0]?.url)),
		Effect.catchAll(() => Effect.succeed(DEFAULT_SOURCE)),
	);
}
