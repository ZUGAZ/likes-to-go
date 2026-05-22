import { errorToReason } from '@/common/model/error-to-reason';
import { Data, Effect } from 'effect';

const SOUNDCLOUD_LIKES_URL = 'https://soundcloud.com';
const SESSION_COOKIE_NAME = 'oauth_token';

export class GetSoundcloudLoginCookieFailed extends Data.TaggedError(
	'GetSoundcloudLoginCookieFailed',
)<{
	readonly reason: string;
}> {}

export function getSoundcloudLoginCookie(): Effect.Effect<
	chrome.cookies.Cookie | null,
	GetSoundcloudLoginCookieFailed
> {
	return Effect.tryPromise({
		try: () =>
			chrome.cookies.get({
				url: SOUNDCLOUD_LIKES_URL,
				name: SESSION_COOKIE_NAME,
			}),
		catch: (err: unknown) =>
			new GetSoundcloudLoginCookieFailed({
				reason: errorToReason(err),
			}),
	}).pipe(
		Effect.tap(() =>
			Effect.log('Getting SoundCloud login cookie', SESSION_COOKIE_NAME),
		),
		Effect.withLogSpan('getSoundcloudLoginCookie'),
	);
}
