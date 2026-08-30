import { Schema } from 'effect';

export const SoundcloudThemePreferenceSchema = Schema.Literal(
	'automatic',
	'dark',
	'light',
);

export type SoundcloudThemePreference = Schema.Schema.Type<
	typeof SoundcloudThemePreferenceSchema
>;

export type ResolvedPopupTheme = 'light' | 'dark';

export function resolveTheme(
	preference: SoundcloudThemePreference,
	prefersDark: boolean,
): ResolvedPopupTheme {
	if (preference === 'dark') {
		return 'dark';
	}

	if (preference === 'light') {
		return 'light';
	}

	return prefersDark ? 'dark' : 'light';
}
