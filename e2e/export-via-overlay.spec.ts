import type {
	CDPSession,
	Locator,
	Page,
	Request,
	Response,
	TestInfo,
} from '@playwright/test';

import { GetStateRequest } from '@/common/model/request-message';
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
	waitForTabId,
} from './soundcloud-mock/background-rpc';
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
	EXPECTED_VALID_TRACK_COUNT,
	expectedExportFilenameFromExportedAt,
} from './soundcloud-mock/expected-badges-export';
import { installSoundCloudMockRoutes } from './soundcloud-mock/install-routes';
import { seedSoundCloudSessionCookie } from './soundcloud-mock/seed-session';

const SESSION_COOKIE_VALUE = 'playwright-export-via-overlay';
const SPEC_TIMEOUT_MS = 90_000;
const COLLECTION_WAIT_MS = 80_000;
const IDLE_WEBP_PATH = '/mascot/idle.webp';

test.describe.configure({ timeout: SPEC_TIMEOUT_MS });

function readDoneTrackCount(value: unknown): number | undefined {
	if (typeof value !== 'object' || value === null) {
		return undefined;
	}

	if (!('status' in value) || !('trackCount' in value)) {
		return undefined;
	}

	if (value.status !== 'done' || typeof value.trackCount !== 'number') {
		return undefined;
	}

	return value.trackCount;
}

function isIdleMascotUrl(url: string, extensionId: string): boolean {
	return url === `chrome-extension://${extensionId}${IDLE_WEBP_PATH}`;
}

function isMascotExtensionUrl(url: string, extensionId: string): boolean {
	try {
		const parsed = new URL(url);
		return (
			parsed.protocol === 'chrome-extension:' &&
			parsed.hostname === extensionId &&
			parsed.pathname.startsWith('/mascot/')
		);
	} catch {
		return false;
	}
}

interface IdleMascotImage {
	readonly src: string;
	readonly complete: boolean;
	readonly naturalWidth: number;
}

function isIdleMascotImage(value: unknown): value is IdleMascotImage {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	if (
		!('src' in value) ||
		!('complete' in value) ||
		!('naturalWidth' in value)
	) {
		return false;
	}

	return (
		typeof value.src === 'string' &&
		typeof value.complete === 'boolean' &&
		typeof value.naturalWidth === 'number'
	);
}

/**
 * WXT mounts Beat in an open shadow on `likes-to-go-beat`. Playwright locators
 * pierce that tree (same as the harness). If pierce cannot reach the img,
 * read `shadowRoot` directly — no production change.
 */
async function readIdleMascotImage(
	overlayHost: Locator,
	page: Page,
): Promise<IdleMascotImage | undefined> {
	const pierced = overlayHost.locator('.beat-mascot img');
	if ((await pierced.count()) > 0) {
		const fromPierce: unknown = await pierced.evaluate((element) => {
			if (!(element instanceof HTMLImageElement)) {
				return undefined;
			}

			return {
				src: element.currentSrc.length > 0 ? element.currentSrc : element.src,
				complete: element.complete,
				naturalWidth: element.naturalWidth,
			};
		});
		return isIdleMascotImage(fromPierce) ? fromPierce : undefined;
	}

	const fromShadow: unknown = await page.evaluate(() => {
		const host = document.querySelector('likes-to-go-beat');
		if (host === null) {
			return undefined;
		}

		const root = host.shadowRoot;
		if (root === null) {
			return undefined;
		}

		const element = root.querySelector('.beat-mascot img');
		if (!(element instanceof HTMLImageElement)) {
			return undefined;
		}

		return {
			src: element.currentSrc.length > 0 ? element.currentSrc : element.src,
			complete: element.complete,
			naturalWidth: element.naturalWidth,
		};
	});

	return isIdleMascotImage(fromShadow) ? fromShadow : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function readIsolatedContextId(value: unknown): number | undefined {
	if (!isRecord(value) || !('context' in value)) {
		return undefined;
	}

	const context = value['context'];
	if (
		!isRecord(context) ||
		!('id' in context) ||
		typeof context['id'] !== 'number'
	) {
		return undefined;
	}

	if ('auxData' in context && isRecord(context['auxData'])) {
		const isDefault = context['auxData']['isDefault'];
		if (isDefault === true) {
			return undefined;
		}
	}

	return context['id'];
}

function readEvaluateReturnedValue(value: unknown): unknown {
	if (!isRecord(value)) {
		return undefined;
	}

	if ('exceptionDetails' in value && value['exceptionDetails'] !== undefined) {
		return undefined;
	}

	if (!('result' in value) || !isRecord(value['result'])) {
		return undefined;
	}

	return value['result']['value'];
}

/**
 * GetState from the likes tab's isolated content-script world.
 * Opening popup.html (sendGetState) remembers ExtensionPopup as the notify
 * surface and starves the overlay of `done`. Do not use that helper here.
 */
async function attachContentWorldGetState(page: Page): Promise<{
	readonly send: () => Promise<unknown>;
	readonly dispose: () => Promise<void>;
}> {
	const session: CDPSession = await page.context().newCDPSession(page);
	const isolatedIds = new Set<number>();
	const request = GetStateRequest();

	session.on('Runtime.executionContextCreated', (event: unknown) => {
		const contextId = readIsolatedContextId(event);
		if (contextId !== undefined) {
			isolatedIds.add(contextId);
		}
	});

	await session.send('Runtime.enable');

	let workingContextId: number | undefined;

	const tryContext = async (contextId: number): Promise<unknown> => {
		const evaluated: unknown = await session.send('Runtime.evaluate', {
			expression: `chrome.runtime.sendMessage({ _tag: ${JSON.stringify(request._tag)} })`,
			awaitPromise: true,
			returnByValue: true,
			contextId,
		});
		return readEvaluateReturnedValue(evaluated);
	};

	return {
		send: async () => {
			if (workingContextId !== undefined) {
				return tryContext(workingContextId);
			}

			for (const contextId of isolatedIds) {
				try {
					const raw = await tryContext(contextId);
					if (typeof raw === 'object' && raw !== null) {
						workingContextId = contextId;
						return raw;
					}
				} catch {
					continue;
				}
			}

			return undefined;
		},
		dispose: async () => {
			await session.detach();
		},
	};
}

test('overlay start export completes against mocked likes and downloads v1 JSON', async ({
	context,
	extensionId,
}, testInfo: TestInfo) => {
	const routes = await installSoundCloudMockRoutes(context);
	await seedSoundCloudSessionCookie(context, SESSION_COOKIE_VALUE);

	const serviceWorker = await waitForExtensionServiceWorker(context);
	await installDownloadCapture(serviceWorker);

	const likesPage = await context.newPage();
	const likesConsole = installConsoleCapture(likesPage);
	const mascot404Urls: string[] = [];
	const mascotRequestFailures: string[] = [];
	let contentGetState:
		| Awaited<ReturnType<typeof attachContentWorldGetState>>
		| undefined;

	likesPage.on('response', (response: Response) => {
		if (
			isMascotExtensionUrl(response.url(), extensionId) &&
			response.status() === 404
		) {
			mascot404Urls.push(response.url());
		}
	});

	likesPage.on('requestfailed', (request: Request) => {
		if (isMascotExtensionUrl(request.url(), extensionId)) {
			const failure = request.failure();
			const reason = failure === null ? 'unknown' : failure.errorText;
			mascotRequestFailures.push(`${request.url()} (${reason})`);
		}
	});

	try {
		const idleRequestPromise = likesPage.waitForRequest((request: Request) =>
			isIdleMascotUrl(request.url(), extensionId),
		);
		const idleResponsePromise = likesPage.waitForResponse(
			(response: Response) => isIdleMascotUrl(response.url(), extensionId),
		);
		const idleFailedPromise = likesPage.waitForEvent('requestfailed', {
			predicate: (request: Request) =>
				isIdleMascotUrl(request.url(), extensionId),
		});

		await likesPage.goto(SOUNDCLOUD_LIKES_URL);

		await expect(likesPage).toHaveURL(SOUNDCLOUD_LIKES_URL);
		expect(new URL(likesPage.url()).origin).toBe(SOUNDCLOUD_ORIGIN);
		expect(new URL(likesPage.url()).pathname).toBe(SOUNDCLOUD_LIKES_PATH);

		await expect(likesPage.locator(USER_NAV_SELECTOR)).toHaveCount(1);
		await expect(likesPage.locator(TRACK_LIST_CONTAINER)).toBeVisible();
		await expect(likesPage.locator(trackCard).first()).toBeVisible();
		await expect(likesPage.locator(LOADING_INDICATOR_SELECTOR)).toHaveCount(0);

		expect(routes.documentUrls()).toContain(SOUNDCLOUD_LIKES_URL);
		expect(routes.continuedToNetwork()).toEqual([]);

		const overlayHost = likesPage.locator(OVERLAY_HOST_SELECTOR);
		await expect(overlayHost).toBeAttached();
		await expect(overlayHost).toHaveAttribute('aria-hidden', 'true');

		const tabId = await waitForTabId(serviceWorker, SOUNDCLOUD_LIKES_URL);
		// Same `{ _tag: 'ToggleMascot' }` payload the toolbar listener sends.
		// This is not toolbar-click coverage — Playwright never clicks the action.
		// toggleMascotOnTab retries only while the content-script receiver is missing.
		await toggleMascotOnTab(serviceWorker, tabId);

		await expect(overlayHost).toHaveAttribute('aria-hidden', 'false');
		const beatRoot = overlayHost.locator(OVERLAY_ROOT_SELECTOR);
		await expect(beatRoot).toBeVisible();
		await expect(
			overlayHost.getByRole('heading', { name: 'Likes to Go', level: 1 }),
		).toBeVisible();

		const startExport = overlayHost.getByRole('button', {
			name: 'Start export',
		});
		await expect(startExport).toBeVisible();

		const idleRequest = await idleRequestPromise;
		expect(idleRequest.url().endsWith(IDLE_WEBP_PATH)).toBe(true);

		let idleResponse: Response | undefined;
		let idleFailedUrl: string | undefined;
		await Promise.race([
			idleResponsePromise.then((response) => {
				idleResponse = response;
			}),
			idleFailedPromise.then((failed) => {
				idleFailedUrl = failed.url();
			}),
		]);

		expect(mascotRequestFailures).toEqual([]);
		expect(idleFailedUrl).toBeUndefined();
		expect(idleResponse).toBeDefined();
		if (idleResponse === undefined) {
			throw new Error('idle mascot response was not observed');
		}

		expect(idleResponse.ok()).toBe(true);
		expect(mascot404Urls).toEqual([]);

		await expect
			.poll(async () => {
				const image = await readIdleMascotImage(overlayHost, likesPage);
				if (image === undefined) {
					return undefined;
				}

				if (!image.src.endsWith(IDLE_WEBP_PATH)) {
					return undefined;
				}

				if (!image.complete || image.naturalWidth <= 0) {
					return undefined;
				}

				return image.naturalWidth;
			})
			.toBeGreaterThan(0);

		expect(mascot404Urls).toEqual([]);

		await startExport.click();

		contentGetState = await attachContentWorldGetState(likesPage);
		const sendGetStateFromOverlay = contentGetState.send;

		await expect
			.poll(
				async () => {
					try {
						return readDoneTrackCount(await sendGetStateFromOverlay());
					} catch {
						return undefined;
					}
				},
				{ timeout: COLLECTION_WAIT_MS },
			)
			.toBe(EXPECTED_VALID_TRACK_COUNT);

		const downloadBackup = overlayHost.getByRole('button', {
			name: 'Download backup',
		});
		await expect(downloadBackup).toBeVisible({ timeout: COLLECTION_WAIT_MS });

		await downloadBackup.click();

		const captured = await waitForCapturedDownload(serviceWorker);
		const payload = assertExpectedBadgesExportPayload(
			decodeExportDataUrl(captured.url),
		);

		expect(expectedExportFilenameFromExportedAt(payload.exported_at)).toMatch(
			/^likes-to-go-\d{4}-\d{2}-\d{2}\.json$/,
		);

		expect(routes.continuedToNetwork()).toEqual([]);
		expect(mascot404Urls).toEqual([]);
		expect(mascotRequestFailures).toEqual([]);
	} catch (error) {
		await attachConsoleOnFailure(testInfo, likesConsole);
		throw error;
	} finally {
		if (contentGetState !== undefined) {
			await contentGetState.dispose();
		}
	}
});
