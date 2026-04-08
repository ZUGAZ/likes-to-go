import { getSoundcloudLoginCookie } from '@/common/infrastructure/soundcloud-login-cookie';
import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
import { LoginRequired } from '@/common/model/collection/events/login-required';
import { LoginVerified } from '@/common/model/collection/events/login-verified';
import { Effect } from 'effect';

export function runCheckLogin(): Effect.Effect<LoginVerified, LoginRequired> {
	return getSoundcloudLoginCookie().pipe(
		Effect.flatMap(Effect.fromNullable),
		Effect.as(LoginVerified()),
		Effect.mapError(() =>
			LoginRequired({
				message: LOGIN_REQUIRED_MESSAGE,
				reason: 'Missing login cookie',
			}),
		),
		Effect.tapBoth({
			onSuccess: () => Effect.log('Login cookie found'),
			onFailure: () => Effect.log('Login cookie not found'),
		}),
		Effect.withLogSpan('runCheckLogin'),
	);
}
