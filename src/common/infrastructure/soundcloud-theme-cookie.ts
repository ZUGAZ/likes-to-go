import { errorToReason } from '@/common/model/error-to-reason';
import {
	SoundcloudThemePreferenceSchema,
	type SoundcloudThemePreference,
} from '@/common/model/soundcloud-theme';
import { Data, Effect, Either, Schema } from 'effect';

const SOUNDCLOUD_URL = 'https://soundcloud.com';
const THEME_COOKIE_NAME = 'sc_theme';
const DEFAULT_THEME_PREFERENCE: SoundcloudThemePreference = 'automatic';

export class GetSoundcloudThemeCookieFailed extends Data.TaggedError(
	'GetSoundcloudThemeCookieFailed',
)<{
	readonly reason: string;
}> {}

function decodeThemePreference(raw: unknown): SoundcloudThemePreference {
	return Schema.decodeUnknownEither(SoundcloudThemePreferenceSchema)(raw).pipe(
		Either.match({
			onLeft: () => DEFAULT_THEME_PREFERENCE,
			onRight: (preference) => preference,
		}),
	);
}

export function getSoundcloudThemePreference(): Effect.Effect<
	SoundcloudThemePreference,
	GetSoundcloudThemeCookieFailed
> {
	return Effect.tryPromise({
		try: () =>
			chrome.cookies.get({
				url: SOUNDCLOUD_URL,
				name: THEME_COOKIE_NAME,
			}),
		catch: (err: unknown) =>
			new GetSoundcloudThemeCookieFailed({
				reason: errorToReason(err),
			}),
	}).pipe(
		Effect.map((cookie) => decodeThemePreference(cookie?.value)),
		Effect.tap(() =>
			Effect.log('Getting SoundCloud theme cookie', THEME_COOKIE_NAME),
		),
		Effect.withLogSpan('getSoundcloudThemePreference'),
	);
}
