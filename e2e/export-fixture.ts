import type { BrowserContext } from '@playwright/test';
import { expect, test as base } from '@playwright/test';

import {
	PRODUCTION_UNPACK_MISSING_HINT,
	PRODUCTION_UNPACKED_DIR,
	assertUnpackedExtensionExists,
	discoverExtensionId,
	launchPersistentExtensionContext,
} from './launch-extension';
import { installSoundCloudMockRoutes } from './soundcloud-mock/install-routes';

type ExportFixtures = {
	context: BrowserContext;
	extensionId: string;
};

export const test = base.extend<ExportFixtures>({
	// Playwright requires object destructuring when a fixture has no upstream deps.
	// eslint-disable-next-line no-empty-pattern -- intentional empty fixture deps
	context: async ({}, use) => {
		assertUnpackedExtensionExists(
			PRODUCTION_UNPACKED_DIR,
			PRODUCTION_UNPACK_MISSING_HINT,
		);

		const context = await launchPersistentExtensionContext(
			PRODUCTION_UNPACKED_DIR,
		);
		// Routes must exist before any SoundCloud tab is created.
		await installSoundCloudMockRoutes(context);

		await use(context);
		await context.close();
	},

	extensionId: async ({ context }, use) => {
		const extensionId = await discoverExtensionId(context);
		await use(extensionId);
	},
});

export { expect };
