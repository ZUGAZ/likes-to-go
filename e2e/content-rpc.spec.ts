import {
	cpSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { BrowserContext, Page, TestInfo } from '@playwright/test';
import { test as base } from '@playwright/test';

import { trackCard } from '@/layout/infrastructure/layouts/badges/selectors';
import { TRACK_LIST_CONTAINER } from '@/layout/infrastructure/selectors/shared';

import {
	attachConsoleOnFailure,
	installConsoleCapture,
	type ConsoleCapture,
} from './console-capture';
import { expect, test } from './export-fixture';
import {
	assertUnpackedExtensionExists,
	discoverExtensionId,
	launchPersistentExtensionContext,
	PRODUCTION_UNPACK_MISSING_HINT,
	PRODUCTION_UNPACKED_DIR,
	waitForExtensionServiceWorker,
} from './launch-extension';
import {
	toggleMascotOnTab,
	waitForTabId,
} from './soundcloud-mock/background-rpc';
import {
	LOADING_INDICATOR_SELECTOR,
	OVERLAY_HOST_SELECTOR,
	SOUNDCLOUD_LIKES_URL,
	USER_NAV_SELECTOR,
} from './soundcloud-mock/constants';
import { seedSoundCloudSessionCookie } from './soundcloud-mock/seed-session';

const SESSION_COOKIE_VALUE = 'playwright-content-rpc';
const SPEC_TIMEOUT_MS = 90_000;
const COLLECTION_WAIT_MS = 80_000;
const MISSING_RECEIVER_COPY = 'Could not open or talk to the likes page';
const PAGE_CHANGED_COPY =
	'Collection stopped because the selected SoundCloud page changed.';

test.describe.configure({ timeout: SPEC_TIMEOUT_MS });

async function attachCaptures(
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
	await testInfo.attach('console-log', {
		body,
		contentType: 'text/plain',
	});
}

test('overlay follows a background port and a popup tab', async ({
	context,
	extensionId,
}, testInfo) => {
	await seedSoundCloudSessionCookie(context, SESSION_COOKIE_VALUE);
	const serviceWorker = await waitForExtensionServiceWorker(context);
	const likesPage = await context.newPage();
	const likesConsole = installConsoleCapture(likesPage);
	let popupConsole: ConsoleCapture | undefined;

	try {
		await likesPage.goto(SOUNDCLOUD_LIKES_URL);
		await expect(likesPage).toHaveURL(SOUNDCLOUD_LIKES_URL);
		await expect(likesPage.locator(USER_NAV_SELECTOR)).toHaveCount(1);
		await expect(likesPage.locator(TRACK_LIST_CONTAINER)).toBeVisible();
		await expect(likesPage.locator(trackCard).first()).toBeVisible();
		await expect(likesPage.locator(LOADING_INDICATOR_SELECTOR)).toHaveCount(0);

		const overlayHost = likesPage.locator(OVERLAY_HOST_SELECTOR);
		await expect(overlayHost).toBeAttached();
		const tabId = await waitForTabId(serviceWorker, SOUNDCLOUD_LIKES_URL);
		await toggleMascotOnTab(serviceWorker, tabId);
		await expect(overlayHost).toHaveAttribute('aria-hidden', 'false');
		await expect.poll(() => likesConsole.flush()).toContain('content rpc peer');
		const peerLine = likesConsole
			.flush()
			.split('\n')
			.find((line) => line.includes('content rpc peer'));
		if (peerLine?.includes('other')) {
			throw new Error(
				'Chrome did not classify the service-worker port as Background.',
			);
		}
		expect(peerLine).toContain('Background');
		await expect(
			overlayHost.getByRole('button', { name: 'Start export' }),
		).toBeVisible();

		const popup = await context.newPage();
		popupConsole = installConsoleCapture(popup);
		await popup.goto(`chrome-extension://${extensionId}/popup.html`);
		await expect(
			popup.getByRole('heading', { name: 'Likes to Go', level: 1 }),
		).toBeVisible();
		await expect(overlayHost).toHaveAttribute('aria-hidden', 'false');
		await expect(
			overlayHost.getByRole('button', { name: 'Start export' }),
		).toBeVisible();

		await popup.getByRole('button', { name: 'Start export' }).click();
		await expect(overlayHost.getByText(/Gathering your likes/)).toBeVisible({
			timeout: COLLECTION_WAIT_MS,
		});
		await expect(popup.getByText(/Gathering your likes/)).toBeVisible({
			timeout: COLLECTION_WAIT_MS,
		});
		await expect(
			overlayHost.getByRole('button', { name: 'Download backup' }),
		).toBeVisible({ timeout: COLLECTION_WAIT_MS });
		await expect(
			popup.getByRole('button', { name: 'Download backup' }),
		).toBeVisible({ timeout: COLLECTION_WAIT_MS });
	} catch (error) {
		const captures = [likesConsole];
		if (popupConsole !== undefined) {
			captures.push(popupConsole);
		}
		await attachCaptures(testInfo, captures);
		throw error;
	}
});

function isJsonRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Chrome injects the production content script at document start for the likes
 * URL, including when the response is aborted. This copy of the production
 * build drops that registration so the tab has no content script.
 */
function copyProductionUnpackWithoutContentScripts(): string {
	assertUnpackedExtensionExists(
		PRODUCTION_UNPACKED_DIR,
		PRODUCTION_UNPACK_MISSING_HINT,
	);
	const directory = mkdtempSync(
		path.join(tmpdir(), 'likes-to-go-no-content-script-'),
	);
	cpSync(PRODUCTION_UNPACKED_DIR, directory, { recursive: true });
	const manifestPath = path.join(directory, 'manifest.json');
	const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
	if (!isJsonRecord(parsed) || !Array.isArray(parsed['content_scripts'])) {
		throw new Error('Production manifest did not register a content script.');
	}
	const manifest = Object.fromEntries(
		Object.entries(parsed).filter(([key]) => key !== 'content_scripts'),
	);
	writeFileSync(manifestPath, `${JSON.stringify(manifest)}\n`);
	return directory;
}

async function openBareExtension(): Promise<{
	readonly context: BrowserContext;
	readonly popup: Page;
	readonly popupConsole: ConsoleCapture;
	readonly unpackDir: string;
}> {
	const unpackDir = copyProductionUnpackWithoutContentScripts();
	try {
		const context = await launchPersistentExtensionContext(unpackDir);
		await seedSoundCloudSessionCookie(context, SESSION_COOKIE_VALUE);
		// Keep the committed URL on the likes page. A failed navigation changes the
		// tab URL and the collection stops for that reason instead.
		await context.route('https://soundcloud.com/**', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'text/html; charset=utf-8',
				body: '<!doctype html><title>likes</title>',
			}),
		);
		const extensionId = await discoverExtensionId(context);
		const popup = await context.newPage();
		const popupConsole = installConsoleCapture(popup);
		await popup.goto(`chrome-extension://${extensionId}/popup.html`);
		await expect(
			popup.getByRole('heading', { name: 'Likes to Go', level: 1 }),
		).toBeVisible();
		return { context, popup, popupConsole, unpackDir };
	} catch (error) {
		rmSync(unpackDir, { recursive: true, force: true });
		throw error;
	}
}

base(
	'a tab without a content script ends on the likes-page error',
	// Playwright requires object destructuring when a fixture has no upstream deps.
	// eslint-disable-next-line no-empty-pattern -- this test launches its own context
	async ({}, testInfo) => {
		const { context, popup, popupConsole, unpackDir } =
			await openBareExtension();
		try {
			await popup.getByRole('button', { name: 'Start export' }).click();
			let status = 'pending';
			try {
				await expect
					.poll(
						async () => {
							if (await popup.getByText(PAGE_CHANGED_COPY).isVisible()) {
								status = 'navigation';
							} else if (
								await popup
									.getByRole('button', { name: 'Download backup' })
									.isVisible()
							) {
								status = 'finished';
							} else if (
								await popup.getByText(MISSING_RECEIVER_COPY).isVisible()
							) {
								status = 'missing-receiver';
							} else if (
								await popup.getByText(/Gathering your likes/).isVisible()
							) {
								status = 'collecting';
							} else {
								status = 'pending';
							}
							return status;
						},
						{ timeout: 8_000 },
					)
					.toBe('missing-receiver');
			} catch (error) {
				if (status === 'navigation') {
					throw new Error(
						'Navigation listener won with the page-changed copy. Leaving transition unchanged.',
					);
				}
				if (status === 'finished' || status === 'collecting') {
					throw new Error(
						'Collection started, so a content script was injected.',
					);
				}
				throw error;
			}
		} catch (error) {
			await attachConsoleOnFailure(testInfo, popupConsole);
			throw error;
		} finally {
			await context.close();
			rmSync(unpackDir, { recursive: true, force: true });
		}
	},
);
