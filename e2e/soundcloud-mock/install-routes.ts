import type { BrowserContext, CDPSession, Request } from '@playwright/test';

import { buildSoundCloudMockHtml } from './mock-page';

const journals = new WeakMap<BrowserContext, SoundCloudRouteJournal>();

export interface SoundCloudRouteJournal {
	readonly documentUrls: () => readonly string[];
	readonly interceptedUrls: () => readonly string[];
	readonly continuedToNetwork: () => readonly string[];
}

interface CdpFetchPausedEvent {
	readonly requestId: string;
	readonly request: {
		readonly url: string;
	};
}

function isSoundCloudHostname(hostname: string): boolean {
	return hostname === 'soundcloud.com' || hostname.endsWith('.soundcloud.com');
}

function isSoundCloudCdnHostname(hostname: string): boolean {
	return hostname === 'sndcdn.com' || hostname.endsWith('.sndcdn.com');
}

function requestUrl(request: Request): string {
	return request.url();
}

function isCdpFetchPausedEvent(value: unknown): value is CdpFetchPausedEvent {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	if (!('requestId' in value) || !('request' in value)) {
		return false;
	}

	if (typeof value.requestId !== 'string') {
		return false;
	}

	const request = value.request;
	if (typeof request !== 'object' || request === null || !('url' in request)) {
		return false;
	}

	return typeof request.url === 'string';
}

/**
 * Playwright `context.route` never sees the first document of a
 * `chrome.tabs.create` navigation (Playwright #21061). Browser-level Fetch
 * catches those documents. `page.goto` still hits `context.route` only.
 */
async function installExtensionCreatedDocumentInterception(
	context: BrowserContext,
	mockHtml: string,
	documentUrls: string[],
	interceptedUrls: string[],
): Promise<void> {
	const browser = context.browser();
	if (browser === null) {
		throw new Error(
			'SoundCloud mock routes need a Chromium browser to intercept extension-created tabs',
		);
	}

	const session: CDPSession = await browser.newBrowserCDPSession();
	await session.send('Fetch.enable', {
		patterns: [
			{
				urlPattern: 'https://soundcloud.com/*',
				resourceType: 'Document',
				requestStage: 'Request',
			},
			{
				urlPattern: 'https://*.soundcloud.com/*',
				resourceType: 'Document',
				requestStage: 'Request',
			},
		],
	});

	session.on('Fetch.requestPaused', (value: unknown) => {
		if (!isCdpFetchPausedEvent(value)) {
			return;
		}

		const url = value.request.url;
		interceptedUrls.push(url);
		documentUrls.push(url);

		void session.send('Fetch.fulfillRequest', {
			requestId: value.requestId,
			responseCode: 200,
			responseHeaders: [
				{ name: 'content-type', value: 'text/html; charset=utf-8' },
			],
			body: Buffer.from(mockHtml).toString('base64'),
		});
	});
}

export async function installSoundCloudMockRoutes(
	context: BrowserContext,
): Promise<SoundCloudRouteJournal> {
	const existing = journals.get(context);
	if (existing !== undefined) {
		return existing;
	}

	const documentUrls: string[] = [];
	const interceptedUrls: string[] = [];
	const continuedToNetwork: string[] = [];
	const mockHtml = buildSoundCloudMockHtml();

	const journal: SoundCloudRouteJournal = {
		documentUrls: () => documentUrls,
		interceptedUrls: () => interceptedUrls,
		continuedToNetwork: () => continuedToNetwork,
	};

	await context.route('**/*', async (route) => {
		const request = route.request();
		const url = requestUrl(request);
		const parsed = new URL(url);
		const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';

		if (!isHttp) {
			await route.continue();
			return;
		}

		if (isSoundCloudHostname(parsed.hostname)) {
			interceptedUrls.push(url);
			if (request.resourceType() === 'document') {
				documentUrls.push(url);
				await route.fulfill({
					status: 200,
					contentType: 'text/html; charset=utf-8',
					body: mockHtml,
				});
				return;
			}

			await route.abort();
			return;
		}

		if (isSoundCloudCdnHostname(parsed.hostname)) {
			interceptedUrls.push(url);
			await route.abort();
			return;
		}

		continuedToNetwork.push(url);
		await route.continue();
	});

	await installExtensionCreatedDocumentInterception(
		context,
		mockHtml,
		documentUrls,
		interceptedUrls,
	);

	journals.set(context, journal);
	return journal;
}
