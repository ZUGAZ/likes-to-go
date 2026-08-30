import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium, type BrowserContext, type Worker } from '@playwright/test';

const EXTENSION_ID_PATTERN = /^chrome-extension:\/\/([a-p]{32})\//;

export const DEV_UNPACKED_DIR = path.resolve(
	process.cwd(),
	'.output/chrome-mv3-dev',
);

export const PRODUCTION_UNPACKED_DIR = path.resolve(
	process.cwd(),
	'.output/chrome-mv3',
);

export const DEV_UNPACK_MISSING_HINT =
	'Run `pnpm build:dev` or `pnpm dev` (or ensure `.output/chrome-mv3-dev` exists).';

export const PRODUCTION_UNPACK_MISSING_HINT =
	'Run `pnpm build` (or ensure `.output/chrome-mv3` exists).';

export function assertUnpackedExtensionExists(
	unpackedDir: string,
	missingHint: string,
): void {
	const manifestPath = path.join(unpackedDir, 'manifest.json');
	if (!existsSync(manifestPath)) {
		throw new Error(
			`Unpacked extension missing at ${manifestPath}. ${missingHint}`,
		);
	}
}

export async function launchPersistentExtensionContext(
	unpackedDir: string,
): Promise<BrowserContext> {
	const userDataDir = process.env['PLAYWRIGHT_USER_DATA_DIR'] ?? '';

	return chromium.launchPersistentContext(userDataDir, {
		channel: 'chromium',
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			`--disable-extensions-except=${unpackedDir}`,
			`--load-extension=${unpackedDir}`,
		],
	});
}

export async function waitForExtensionServiceWorker(
	context: BrowserContext,
): Promise<Worker> {
	const existingWorkers = context.serviceWorkers();
	const firstWorker = existingWorkers[0];
	if (firstWorker !== undefined) {
		return firstWorker;
	}

	return context.waitForEvent('serviceworker');
}

function parseExtensionId(serviceWorkerUrl: string): string {
	const match = EXTENSION_ID_PATTERN.exec(serviceWorkerUrl);
	const extensionId = match?.[1];
	if (extensionId === undefined) {
		throw new Error(
			`Could not parse extension id from service worker URL: ${serviceWorkerUrl}`,
		);
	}
	return extensionId;
}

export async function discoverExtensionId(
	context: BrowserContext,
): Promise<string> {
	const serviceWorker = await waitForExtensionServiceWorker(context);
	return parseExtensionId(serviceWorker.url());
}
