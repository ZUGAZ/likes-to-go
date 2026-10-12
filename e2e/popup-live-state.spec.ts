import type { BrowserContext, Page, TestInfo } from '@playwright/test';

import { trackCard } from '@/layout/infrastructure/layouts/badges/selectors';
import { TRACK_LIST_CONTAINER } from '@/layout/infrastructure/selectors/shared';

import {
	attachConsoleOnFailure,
	installConsoleCapture,
	type ConsoleCapture,
} from './console-capture';
import { expect, test } from './export-fixture';
import { waitForExtensionServiceWorker } from './launch-extension';
import {
	LOADING_INDICATOR_SELECTOR,
	OVERLAY_HOST_SELECTOR,
	SOUNDCLOUD_LIKES_URL,
	USER_NAV_SELECTOR,
} from './soundcloud-mock/constants';
import { installSoundCloudMockRoutes } from './soundcloud-mock/install-routes';
import { seedSoundCloudSessionCookie } from './soundcloud-mock/seed-session';

const SESSION_COOKIE_VALUE = 'playwright-popup-live-state';
const SPEC_TIMEOUT_MS = 90_000;
const COLLECTION_WAIT_MS = 80_000;

test.describe.configure({ timeout: SPEC_TIMEOUT_MS });

async function attachPopupConsoles(
	testInfo: TestInfo,
	captures: ReadonlyArray<ConsoleCapture>,
): Promise<void> {
	const body = captures
		.map((capture) => capture.flush())
		.filter((entry) => entry.length > 0)
		.join('\n---\n');
	if (body.length === 0) {
		return;
	}
	await testInfo.attach('popup-console', {
		body,
		contentType: 'text/plain',
	});
}

async function openPopup(
	context: BrowserContext,
	extensionId: string,
): Promise<{ readonly page: Page; readonly console: ConsoleCapture }> {
	const page = await context.newPage();
	const consoleCapture = installConsoleCapture(page);
	await page.goto(`chrome-extension://${extensionId}/popup.html`);
	await expect(
		page.getByRole('heading', { name: 'Likes to Go', level: 1 }),
	).toBeVisible();
	return { page, console: consoleCapture };
}

test('open popups follow the same collection and a late popup sees the current state', async ({
	context,
	extensionId,
}, testInfo) => {
	await installSoundCloudMockRoutes(context);
	await seedSoundCloudSessionCookie(context, SESSION_COOKIE_VALUE);
	await waitForExtensionServiceWorker(context);

	const popupA = await openPopup(context, extensionId);
	const popupB = await openPopup(context, extensionId);
	await expect(
		popupA.page.getByRole('button', { name: 'Start export' }),
	).toBeVisible();
	await expect(
		popupB.page.getByRole('button', { name: 'Start export' }),
	).toBeVisible();
	let likesConsole: ConsoleCapture | undefined;

	try {
		const likesPagePromise = context.waitForEvent('page');
		await popupA.page.getByRole('button', { name: 'Start export' }).click();
		const likesPage = await likesPagePromise;
		likesConsole = installConsoleCapture(likesPage);
		await expect(likesPage).toHaveURL(SOUNDCLOUD_LIKES_URL);
		await expect(likesPage.locator(USER_NAV_SELECTOR)).toHaveCount(1);
		await expect(likesPage.locator(TRACK_LIST_CONTAINER)).toBeVisible();
		await expect(likesPage.locator(trackCard).first()).toBeVisible();
		await expect(likesPage.locator(LOADING_INDICATOR_SELECTOR)).toHaveCount(0);

		const overlayHost = likesPage.locator(OVERLAY_HOST_SELECTOR);
		await expect(overlayHost).toBeAttached();
		await expect(overlayHost).toHaveAttribute('aria-hidden', 'true');

		await expect(popupB.page.getByText(/Gathering your likes/)).toBeVisible({
			timeout: COLLECTION_WAIT_MS,
		});
		await expect(
			popupB.page.getByRole('button', { name: 'Download backup' }),
		).toBeVisible({ timeout: COLLECTION_WAIT_MS });
		await expect(overlayHost).toHaveAttribute('aria-hidden', 'true');

		const popupC = await openPopup(context, extensionId);
		await expect(
			popupC.page.getByRole('button', { name: 'Download backup' }),
		).toBeVisible();
		await expect(
			popupC.page.getByRole('button', { name: 'Start export' }),
		).toHaveCount(0);
		await expect(overlayHost).toHaveAttribute('aria-hidden', 'true');
	} catch (error) {
		await attachPopupConsoles(testInfo, [popupA.console, popupB.console]);
		if (likesConsole !== undefined) {
			await attachConsoleOnFailure(testInfo, likesConsole);
		}
		throw error;
	}
});
