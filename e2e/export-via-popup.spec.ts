import type { TestInfo } from '@playwright/test';

import { trackCard } from '@/layout/infrastructure/layouts/badges/selectors';
import { TRACK_LIST_CONTAINER } from '@/layout/infrastructure/selectors/shared';

import {
	attachConsoleOnFailure,
	installConsoleCapture,
	type ConsoleCapture,
} from './console-capture';
import { expect, test } from './export-fixture';
import { waitForExtensionServiceWorker } from './launch-extension';
import { waitForTabId } from './soundcloud-mock/background-rpc';
import {
	LOADING_INDICATOR_SELECTOR,
	OVERLAY_HOST_SELECTOR,
	OVERLAY_ROOT_SELECTOR,
	SOUNDCLOUD_LIKES_PATH,
	SOUNDCLOUD_LIKES_URL,
	SOUNDCLOUD_ORIGIN,
	USER_NAV_SELECTOR,
} from './soundcloud-mock/constants';
import {
	decodeExportDataUrl,
	installDownloadCapture,
	waitForCapturedDownload,
} from './soundcloud-mock/download-capture';
import {
	assertExpectedBadgesExportPayload,
	expectedExportFilenameFromExportedAt,
} from './soundcloud-mock/expected-badges-export';
import { installSoundCloudMockRoutes } from './soundcloud-mock/install-routes';
import { seedSoundCloudSessionCookie } from './soundcloud-mock/seed-session';

const SESSION_COOKIE_VALUE = 'playwright-export-via-popup';
const SPEC_TIMEOUT_MS = 90_000;
const COLLECTION_WAIT_MS = 80_000;

test.describe.configure({ timeout: SPEC_TIMEOUT_MS });

async function attachLikesConsoleOnFailure(
	testInfo: TestInfo,
	capture: ConsoleCapture,
): Promise<void> {
	const body = capture.flush();
	if (body.length === 0) {
		return;
	}

	await testInfo.attach('likes-page-console', {
		body,
		contentType: 'text/plain',
	});
}

test('popup start export completes against mocked likes and downloads v1 JSON', async ({
	context,
	extensionId,
}, testInfo) => {
	const routes = await installSoundCloudMockRoutes(context);
	await seedSoundCloudSessionCookie(context, SESSION_COOKIE_VALUE);

	const serviceWorker = await waitForExtensionServiceWorker(context);
	await installDownloadCapture(serviceWorker);

	const popup = await context.newPage();
	const popupConsole = installConsoleCapture(popup);
	let likesConsole: ConsoleCapture | undefined;

	try {
		await popup.goto(`chrome-extension://${extensionId}/popup.html`);

		await expect(
			popup.getByRole('heading', { name: 'Likes to Go', level: 1 }),
		).toBeVisible();
		await expect(popup.locator('main.beat-root')).toBeVisible();

		const startExport = popup.getByRole('button', { name: 'Start export' });
		await expect(startExport).toBeVisible();

		const likesPagePromise = context.waitForEvent('page');
		await startExport.click();
		const likesPage = await likesPagePromise;
		likesConsole = installConsoleCapture(likesPage);

		await expect(likesPage).toHaveURL(SOUNDCLOUD_LIKES_URL);
		expect(new URL(likesPage.url()).origin).toBe(SOUNDCLOUD_ORIGIN);
		expect(new URL(likesPage.url()).pathname).toBe(SOUNDCLOUD_LIKES_PATH);

		await expect(likesPage.locator(USER_NAV_SELECTOR)).toHaveCount(1);
		await expect(likesPage.locator(TRACK_LIST_CONTAINER)).toBeVisible();
		await expect(likesPage.locator(trackCard).first()).toBeVisible();
		await expect(likesPage.locator(LOADING_INDICATOR_SELECTOR)).toHaveCount(0);

		expect(routes.documentUrls()).toContain(SOUNDCLOUD_LIKES_URL);
		expect(routes.continuedToNetwork()).toEqual([]);

		await waitForTabId(serviceWorker, SOUNDCLOUD_LIKES_URL);

		const overlayHost = likesPage.locator(OVERLAY_HOST_SELECTOR);
		await expect(overlayHost).toBeAttached();
		await expect(overlayHost).toHaveAttribute('aria-hidden', 'true');

		await expect(popup.getByText(/Gathering your likes/)).toBeVisible({
			timeout: COLLECTION_WAIT_MS,
		});
		await expect(overlayHost).toHaveAttribute('aria-hidden', 'true');

		await expect(
			popup.getByRole('button', { name: 'Download backup' }),
		).toBeVisible({ timeout: COLLECTION_WAIT_MS });

		await popup.getByRole('button', { name: 'Download backup' }).click();

		const captured = await waitForCapturedDownload(serviceWorker);
		const payload = assertExpectedBadgesExportPayload(
			decodeExportDataUrl(captured.url),
		);

		expect(expectedExportFilenameFromExportedAt(payload.exported_at)).toMatch(
			/^likes-to-go-\d{4}-\d{2}-\d{2}\.json$/,
		);

		expect(routes.continuedToNetwork()).toEqual([]);

		await expect(
			popup.getByRole('button', { name: 'Start export' }),
		).toBeVisible();
		await expect(overlayHost).toHaveAttribute('aria-hidden', 'true');
	} catch (error) {
		await attachConsoleOnFailure(testInfo, popupConsole);
		if (likesConsole !== undefined) {
			await attachLikesConsoleOnFailure(testInfo, likesConsole);
		}
		throw error;
	}
});

test('popup-started export shows the likes overlay after the popup closes', async ({
	context,
	extensionId,
}, testInfo) => {
	const routes = await installSoundCloudMockRoutes(context);
	await seedSoundCloudSessionCookie(context, SESSION_COOKIE_VALUE);

	const serviceWorker = await waitForExtensionServiceWorker(context);
	await installDownloadCapture(serviceWorker);

	const popup = await context.newPage();
	const popupConsole = installConsoleCapture(popup);
	let likesConsole: ConsoleCapture | undefined;

	try {
		await popup.goto(`chrome-extension://${extensionId}/popup.html`);

		await expect(
			popup.getByRole('heading', { name: 'Likes to Go', level: 1 }),
		).toBeVisible();

		const likesPagePromise = context.waitForEvent('page');
		await popup.getByRole('button', { name: 'Start export' }).click();
		const likesPage = await likesPagePromise;
		likesConsole = installConsoleCapture(likesPage);

		await expect(likesPage).toHaveURL(SOUNDCLOUD_LIKES_URL);
		await expect(likesPage.locator(USER_NAV_SELECTOR)).toHaveCount(1);
		await expect(likesPage.locator(TRACK_LIST_CONTAINER)).toBeVisible();
		await expect(likesPage.locator(trackCard).first()).toBeVisible();

		const overlayHost = likesPage.locator(OVERLAY_HOST_SELECTOR);
		await expect(overlayHost).toBeAttached();
		await expect(overlayHost).toHaveAttribute('aria-hidden', 'true');

		await waitForTabId(serviceWorker, SOUNDCLOUD_LIKES_URL);
		await popup.close();

		await expect(overlayHost).toHaveAttribute('aria-hidden', 'false');
		await expect(overlayHost.locator(OVERLAY_ROOT_SELECTOR)).toBeVisible();
		await expect(
			overlayHost.getByRole('heading', { name: 'Likes to Go', level: 1 }),
		).toBeVisible();
		await expect(
			overlayHost.getByRole('button', { name: /^(Stop|Download backup)$/ }),
		).toBeVisible({ timeout: COLLECTION_WAIT_MS });

		const downloadBackup = overlayHost.getByRole('button', {
			name: 'Download backup',
		});
		await expect(downloadBackup).toBeVisible({ timeout: COLLECTION_WAIT_MS });
		await downloadBackup.click();

		const captured = await waitForCapturedDownload(serviceWorker);
		assertExpectedBadgesExportPayload(decodeExportDataUrl(captured.url));
		expect(routes.continuedToNetwork()).toEqual([]);
	} catch (error) {
		await attachConsoleOnFailure(testInfo, popupConsole);
		if (likesConsole !== undefined) {
			await attachLikesConsoleOnFailure(testInfo, likesConsole);
		}
		throw error;
	}
});
