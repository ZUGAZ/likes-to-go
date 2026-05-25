import { beforeEach, describe, expect, layer, vi } from '@effect/vitest';
import { Cause, Effect, Exit, Option } from 'effect';
import { runCheckLogin } from '@/background/commands/run-check-login';
import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
import { LoginRequired } from '@/common/model/collection/events/login-required';
import { LoginVerified } from '@/common/model/collection/events/login-verified';
import { silentLoggerLayer } from '@/test/effect-log-test';

declare const chrome: typeof globalThis.chrome;

describe('runCheckLogin', () => {
	type GetCookie = (
		details: chrome.cookies.CookieDetails,
	) => Promise<chrome.cookies.Cookie | null>;

	const getCookieMock = vi.fn<GetCookie>();

	beforeEach(() => {
		getCookieMock.mockReset();

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
		it.effect('succeeds when soundcloud session cookie exists', () =>
			Effect.gen(function* () {
				getCookieMock.mockResolvedValueOnce({
					domain: 'soundcloud.com',
					expirationDate: 1,
					hostOnly: false,
					httpOnly: true,
					name: 'oauth_token',
					path: '/',
					sameSite: 'no_restriction',
					secure: true,
					session: false,
					storeId: '0',
					value: 'session',
				});

				const exit = yield* Effect.exit(runCheckLogin());
				expect(exit).toEqual(Exit.succeed(LoginVerified()));
			}),
		);

		it.effect('fails with LoginRequired when cookie is missing', () =>
			Effect.gen(function* () {
				getCookieMock.mockResolvedValueOnce(null);

				const exit = yield* Effect.exit(runCheckLogin());

				expect(Exit.isFailure(exit)).toBe(true);
				if (!Exit.isFailure(exit)) return;

				const failure = exit.cause.pipe(
					Cause.failureOption,
					Option.getOrUndefined,
				);
				expect(failure).toEqual(
					LoginRequired({
						message: LOGIN_REQUIRED_MESSAGE,
						reason: 'Missing login cookie',
					}),
				);
			}),
		);
	});
});
