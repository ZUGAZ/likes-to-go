import type { BrowserContext, Request } from '@playwright/test';

import { buildSoundCloudMockHtml } from './mock-page';

const journals = new WeakMap<BrowserContext, SoundCloudRouteJournal>();

export interface SoundCloudRouteJournal {
	readonly documentUrls: () => readonly string[];
	readonly interceptedUrls: () => readonly string[];
	readonly continuedToNetwork: () => readonly string[];
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

	journals.set(context, journal);
	return journal;
}
