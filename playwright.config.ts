import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	testMatch: [
		'extension-load.spec.ts',
		'popup-shell.spec.ts',
		'soundcloud-mock-harness.spec.ts',
	],
	fullyParallel: false,
	workers: 1,
	timeout: 30_000,
	expect: {
		timeout: 10_000,
	},
});
