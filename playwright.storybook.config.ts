import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	testMatch: 'storybook-smoke.spec.ts',
	fullyParallel: false,
	workers: 1,
	timeout: 30_000,
	expect: {
		timeout: 10_000,
	},
});
