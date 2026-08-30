import { trackCard } from '@/layout/infrastructure/layouts/badges/selectors';
import { TRACK_LIST_CONTAINER } from '@/layout/infrastructure/selectors/shared';

import {
	attachConsoleOnFailure,
	installConsoleCapture,
} from './console-capture';
import { expect, test } from './export-fixture';
import { waitForExtensionServiceWorker } from './launch-extension';
import {
	toggleMascotOnTab,
	sendGetState,
	waitForGetStateStatus,
	waitForTabId,
} from './soundcloud-mock/background-rpc';
import {
	LOADING_INDICATOR_SELECTOR,
	OVERLAY_HOST_SELECTOR,
	OVERLAY_ROOT_SELECTOR,
	SOUNDCLOUD_LIKES_PATH,
	SOUNDCLOUD_LIKES_URL,
	SOUNDCLOUD_ORIGIN,
	SOUNDCLOUD_SESSION_COOKIE_NAME,
	USER_NAV_SELECTOR,
} from './soundcloud-mock/constants';
import {
	decodeExportDataUrl,
	installDownloadCapture,
	startJsonDataUrlDownload,
	waitForCapturedDownload,
	type DownloadCapture,
} from './soundcloud-mock/download-capture';
import {
	installSoundCloudMockRoutes,
	type SoundCloudRouteJournal,
} from './soundcloud-mock/install-routes';
import {
	readSoundCloudSessionCookieFromWorker,
	seedSoundCloudSessionCookie,
} from './soundcloud-mock/seed-session';

const SESSION_COOKIE_VALUE = 'playwright-export-harness';
const SYNTHETIC_EXPORT = { harness: 'soundcloud-mock', ok: true };
const SYNTHETIC_FILENAME = 'likes-to-go-harness.json';

function isCookieNamed(
	value: unknown,
	name: string,
	cookieValue: string,
): boolean {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	if (!('name' in value) || !('value' in value)) {
		return false;
	}

	return value.name === name && value.value === cookieValue;
}

function hasCollectionStatus(value: unknown): boolean {
	return (
		typeof value === 'object' &&
		value !== null &&
		'status' in value &&
		typeof value.status === 'string'
	);
}

test('soundcloud mock harness seams', async ({
	context,
	extensionId,
}, testInfo) => {
	const routes: SoundCloudRouteJournal =
		await installSoundCloudMockRoutes(context);
	await seedSoundCloudSessionCookie(context, SESSION_COOKIE_VALUE);

	const serviceWorker = await waitForExtensionServiceWorker(context);
	await installDownloadCapture(serviceWorker);

	const cookie = await readSoundCloudSessionCookieFromWorker(serviceWorker);
	expect(
		isCookieNamed(cookie, SOUNDCLOUD_SESSION_COOKIE_NAME, SESSION_COOKIE_VALUE),
	).toBe(true);

	const page = await context.newPage();
	const consoleCapture = installConsoleCapture(page);

	try {
		await page.goto(SOUNDCLOUD_LIKES_URL);

		await expect(page).toHaveURL(SOUNDCLOUD_LIKES_URL);
		expect(new URL(page.url()).origin).toBe(SOUNDCLOUD_ORIGIN);
		expect(new URL(page.url()).pathname).toBe(SOUNDCLOUD_LIKES_PATH);

		await expect(page.locator(USER_NAV_SELECTOR)).toHaveCount(1);
		await expect(page.locator(TRACK_LIST_CONTAINER)).toBeVisible();
		await expect(page.locator(trackCard).first()).toBeVisible();
		await expect(page.locator(LOADING_INDICATOR_SELECTOR)).toHaveCount(0);

		expect(routes.documentUrls()).toContain(SOUNDCLOUD_LIKES_URL);
		expect(
			routes.interceptedUrls().some((url) => url.startsWith(SOUNDCLOUD_ORIGIN)),
		).toBe(true);
		expect(routes.continuedToNetwork()).toEqual([]);

		const overlayHost = page.locator(OVERLAY_HOST_SELECTOR);
		await expect(overlayHost).toBeAttached();
		await expect(overlayHost).toHaveAttribute('aria-hidden', 'true');

		const tabId = await waitForTabId(serviceWorker, SOUNDCLOUD_LIKES_URL);
		await toggleMascotOnTab(serviceWorker, tabId);

		await expect(overlayHost).toHaveAttribute('aria-hidden', 'false');
		await expect(overlayHost.locator(OVERLAY_ROOT_SELECTOR)).toBeVisible();

		const state = await sendGetState(context, extensionId);
		expect(hasCollectionStatus(state)).toBe(true);
		await waitForGetStateStatus(context, extensionId, 'idle');

		const syntheticJson = JSON.stringify(SYNTHETIC_EXPORT);
		await startJsonDataUrlDownload(
			serviceWorker,
			syntheticJson,
			SYNTHETIC_FILENAME,
		);

		const captured: DownloadCapture =
			await waitForCapturedDownload(serviceWorker);
		expect(typeof captured.id).toBe('number');
		expect(typeof captured.filename).toBe('string');
		expect(decodeExportDataUrl(captured.url)).toEqual({
			harness: 'soundcloud-mock',
			ok: true,
		});
	} catch (error) {
		await attachConsoleOnFailure(testInfo, consoleCapture);
		throw error;
	}
});
