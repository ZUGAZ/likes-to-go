import { existsSync } from 'node:fs';
import path from 'node:path';
import {
	chromium,
	expect,
	test as base,
	type BrowserContext,
} from '@playwright/test';

const EXTENSION_DIR = path.resolve(process.cwd(), '.output/chrome-mv3-dev');
const MANIFEST_PATH = path.join(EXTENSION_DIR, 'manifest.json');

const EXTENSION_ID_PATTERN = /^chrome-extension:\/\/([a-p]{32})\//;

function assertExtensionBuilt(): void {
	if (!existsSync(MANIFEST_PATH)) {
		throw new Error(
			`Unpacked extension missing at ${MANIFEST_PATH}. Run \`pnpm build:dev\` or \`pnpm dev\` (or ensure \`.output/chrome-mv3-dev\` exists).`,
		);
	}
}

function parseExtensionId(serviceWorkerUrl: string): string {
	const match = EXTENSION_ID_PATTERN.exec(serviceWorkerUrl);
	if (!match?.[1]) {
		throw new Error(
			`Could not parse extension id from service worker URL: ${serviceWorkerUrl}`,
		);
	}
	return match[1];
}

async function discoverExtensionId(context: BrowserContext): Promise<string> {
	const existingWorkers = context.serviceWorkers();
	const firstWorker = existingWorkers[0];
	if (firstWorker !== undefined) {
		return parseExtensionId(firstWorker.url());
	}

	const serviceWorker = await context.waitForEvent('serviceworker');
	return parseExtensionId(serviceWorker.url());
}

type ExtensionFixtures = {
	context: BrowserContext;
	extensionId: string;
};

export const test = base.extend<ExtensionFixtures>({
	// Playwright requires object destructuring when a fixture has no upstream deps.
	// eslint-disable-next-line no-empty-pattern -- intentional empty fixture deps
	context: async ({}, use) => {
		assertExtensionBuilt();

		const pathToExtension = EXTENSION_DIR;
		const userDataDir = process.env['PLAYWRIGHT_USER_DATA_DIR'] ?? '';

		const context = await chromium.launchPersistentContext(userDataDir, {
			channel: 'chromium',
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				`--disable-extensions-except=${pathToExtension}`,
				`--load-extension=${pathToExtension}`,
			],
		});

		await use(context);
		await context.close();
	},

	extensionId: async ({ context }, use) => {
		const extensionId = await discoverExtensionId(context);
		await use(extensionId);
	},
});

export { expect };
