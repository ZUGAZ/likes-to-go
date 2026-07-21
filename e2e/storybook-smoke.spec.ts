import { expect, test } from '@playwright/test';

const storybookBaseUrl = process.env['PLAYWRIGHT_STORYBOOK_URL'];

test.describe('Storybook smoke', () => {
	test.skip(
		storybookBaseUrl === undefined || storybookBaseUrl.length === 0,
		'Set PLAYWRIGHT_STORYBOOK_URL to run Storybook smoke',
	);

	test('BeatView initial story renders shell', async ({ page }) => {
		const baseUrl = storybookBaseUrl ?? 'http://127.0.0.1:6006';
		await page.goto(`${baseUrl}/?path=/story/mascot-beatview--initial`);

		const preview = page.frameLocator('#storybook-preview-iframe');

		await expect(
			preview.getByRole('heading', { name: 'Likes to Go' }),
		).toBeVisible();
		await expect(preview.locator('main.beat-root')).toBeVisible();
		await expect(
			preview.getByRole('button', { name: 'Start export' }),
		).toBeVisible();
	});
});
