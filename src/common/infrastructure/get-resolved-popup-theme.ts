import { getSoundcloudThemePreference } from '@/common/infrastructure/soundcloud-theme-cookie';
import {
	resolveTheme,
	type SoundcloudThemePreference,
	type ResolvedPopupTheme,
} from '@/common/model/soundcloud-theme';
import { Effect } from 'effect';

const PREFERS_DARK_QUERY = '(prefers-color-scheme: dark)';
const DEFAULT_THEME_PREFERENCE: SoundcloudThemePreference = 'automatic';

export function getResolvedPopupThemeEffect(): Effect.Effect<ResolvedPopupTheme> {
	return Effect.gen(function* () {
		const preference = yield* getSoundcloudThemePreference().pipe(
			Effect.catchTag('GetSoundcloudThemeCookieFailed', () =>
				Effect.succeed(DEFAULT_THEME_PREFERENCE),
			),
		);
		const prefersDark = yield* Effect.sync(
			() => globalThis.matchMedia(PREFERS_DARK_QUERY).matches,
		);

		return resolveTheme(preference, prefersDark);
	}).pipe(Effect.withLogSpan('getResolvedPopupThemeEffect'));
}
