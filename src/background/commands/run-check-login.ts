import { getSoundcloudLoginCookie } from '@/common/infrastructure/soundcloud-login-cookie';
import { LoginRequired } from '@/common/model/collection/events/login-required';
import { LoginVerified } from '@/common/model/collection/events/login-verified';
import { Effect } from 'effect';

const LOGIN_REQUIRED_MESSAGE = 'Please log in to SoundCloud, then try again.';

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
		Effect.withLogSpan('runCheckLogin'),
	);
}
