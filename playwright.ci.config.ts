import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	testMatch: [
		'soundcloud-mock-harness.spec.ts',
		'export-via-popup.spec.ts',
		'export-via-overlay.spec.ts',
	],
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 90_000,
	expect: {
		timeout: 10_000,
	},
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
});
