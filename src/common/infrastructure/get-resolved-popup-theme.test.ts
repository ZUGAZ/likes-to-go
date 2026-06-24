import { beforeEach, describe, expect, layer, vi } from '@effect/vitest';
import { Effect } from 'effect';

import { getResolvedPopupThemeEffect } from '@/common/infrastructure/get-resolved-popup-theme';
import { silentLoggerLayer } from '@/test/effect-log-test';

declare const chrome: typeof globalThis.chrome;

describe('getResolvedPopupThemeEffect', () => {
	type GetCookie = (
		details: chrome.cookies.CookieDetails,
	) => Promise<chrome.cookies.Cookie | null>;

	const getCookieMock = vi.fn<GetCookie>();

	function makeThemeCookie(value: string): chrome.cookies.Cookie {
		return {
			domain: 'soundcloud.com',
			expirationDate: 1,
			hostOnly: false,
			httpOnly: false,
			name: 'sc_theme',
			path: '/',
			sameSite: 'no_restriction',
			secure: true,
			session: false,
			storeId: '0',
			value,
		};
	}

	function makeMediaQueryList(matches: boolean, media: string): MediaQueryList {
		return {
			matches,
			media,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(() => true),
		};
	}

	function setPrefersDark(prefersDark: boolean): void {
		Object.defineProperty(globalThis, 'matchMedia', {
			configurable: true,
			writable: true,
			value: vi.fn((query: string) => makeMediaQueryList(prefersDark, query)),
		});
	}

	beforeEach(() => {
		getCookieMock.mockReset();
		setPrefersDark(false);

		Object.defineProperty(globalThis, 'chrome', {
			configurable: true,
			writable: true,
			value: {
				cookies: {
					get: getCookieMock,
				},
			},
		});
	});

	layer(silentLoggerLayer)((it) => {
		it.effect('reads the sc_theme cookie from SoundCloud', () =>
			Effect.gen(function* () {
				getCookieMock.mockResolvedValueOnce(makeThemeCookie('light'));

				const theme = yield* getResolvedPopupThemeEffect();

				expect(theme).toBe('light');
				expect(getCookieMock).toHaveBeenCalledWith({
					url: 'https://soundcloud.com',
					name: 'sc_theme',
				});
			}),
		);

		it.effect('resolves explicit dark preference', () =>
			Effect.gen(function* () {
				setPrefersDark(false);
				getCookieMock.mockResolvedValueOnce(makeThemeCookie('dark'));

				const theme = yield* getResolvedPopupThemeEffect();

				expect(theme).toBe('dark');
			}),
		);

		it.effect('resolves explicit light preference', () =>
			Effect.gen(function* () {
				setPrefersDark(true);
				getCookieMock.mockResolvedValueOnce(makeThemeCookie('light'));

				const theme = yield* getResolvedPopupThemeEffect();

				expect(theme).toBe('light');
			}),
		);

		it.effect('resolves automatic preference from matchMedia', () =>
			Effect.gen(function* () {
				setPrefersDark(true);
				getCookieMock.mockResolvedValueOnce(makeThemeCookie('automatic'));

				const theme = yield* getResolvedPopupThemeEffect();

				expect(theme).toBe('dark');
			}),
		);

		it.effect('falls back to automatic when the cookie is missing', () =>
			Effect.gen(function* () {
				setPrefersDark(false);
				getCookieMock.mockResolvedValueOnce(null);

				const theme = yield* getResolvedPopupThemeEffect();

				expect(theme).toBe('light');
			}),
		);

		it.effect('falls back to automatic when the cookie value is invalid', () =>
			Effect.gen(function* () {
				setPrefersDark(true);
				getCookieMock.mockResolvedValueOnce(makeThemeCookie('unexpected'));

				const theme = yield* getResolvedPopupThemeEffect();

				expect(theme).toBe('dark');
			}),
		);
	});
});
