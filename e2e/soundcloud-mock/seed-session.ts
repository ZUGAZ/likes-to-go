import type { BrowserContext, Worker } from '@playwright/test';

import { SOUNDCLOUD_ORIGIN, SOUNDCLOUD_SESSION_COOKIE_NAME } from './constants';

export async function seedSoundCloudSessionCookie(
	context: BrowserContext,
	value: string,
): Promise<void> {
	await context.addCookies([
		{
			name: SOUNDCLOUD_SESSION_COOKIE_NAME,
			value,
			url: SOUNDCLOUD_ORIGIN,
		},
	]);
}

export async function readSoundCloudSessionCookieFromWorker(
	worker: Worker,
): Promise<unknown> {
	const cookie: unknown = await worker.evaluate(
		async (details: { url: string; name: string }) => {
			const result: unknown = await chrome.cookies.get(details);
			return result;
		},
		{
			url: SOUNDCLOUD_ORIGIN,
			name: SOUNDCLOUD_SESSION_COOKIE_NAME,
		},
	);
	return cookie;
}
