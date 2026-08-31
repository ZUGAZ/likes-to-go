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

	test('BeatView done story offers download and dismiss', async ({ page }) => {
		const baseUrl = storybookBaseUrl ?? 'http://127.0.0.1:6006';
		await page.goto(`${baseUrl}/?path=/story/mascot-beatview--done`);

		const preview = page.frameLocator('#storybook-preview-iframe');

		await expect(
			preview.getByRole('button', { name: 'Download backup' }),
		).toBeVisible();
		const dismiss = preview.getByRole('button', { name: 'Dismiss' });
		await expect(dismiss).toBeVisible();
		await dismiss.click();
		await expect(
			preview.getByRole('button', { name: 'Download backup' }),
		).toBeVisible();
	});

	test('BeatView saving story shows save copy without a download button', async ({
		page,
	}) => {
		const baseUrl = storybookBaseUrl ?? 'http://127.0.0.1:6006';
		await page.goto(`${baseUrl}/?path=/story/mascot-beatview--saving`);

		const preview = page.frameLocator('#storybook-preview-iframe');

		await expect(
			preview.getByText('Pick a place to save your backup.'),
		).toBeVisible();
		await expect(
			preview.getByRole('button', { name: 'Download backup' }),
		).toHaveCount(0);
		await expect(preview.locator('[aria-busy="true"]')).toBeVisible();
	});

	test('Beat sticker ring is present in light, dark, and overlay', async ({
		page,
	}) => {
		const baseUrl = storybookBaseUrl ?? 'http://127.0.0.1:6006';
		const stories: ReadonlyArray<{
			id: string;
			expectedRingChannel: '229' | '255';
		}> = [
			{ id: 'mascot-beatview--initial', expectedRingChannel: '229' },
			{ id: 'mascot-beatview--dark', expectedRingChannel: '255' },
			{ id: 'mascot-beatview--overlay', expectedRingChannel: '229' },
			{
				id: 'mascot-beatview--overlay&args=theme:dark',
				expectedRingChannel: '255',
			},
		];

		for (const story of stories) {
			await page.goto(`${baseUrl}/iframe.html?id=${story.id}`);

			const img = page.locator('.beat-mascot img');
			await expect(img).toBeVisible();

			const { filter, overflow, ring } = await img.evaluate((element) => {
				const mascot = element.closest('.beat-mascot');
				if (mascot === null) {
					return { filter: '', overflow: '', ring: '' };
				}
				return {
					filter: getComputedStyle(element).filter,
					overflow: getComputedStyle(mascot).overflow,
					ring: getComputedStyle(mascot)
						.getPropertyValue('--beat-mascot-ring')
						.trim(),
				};
			});

			expect(filter, story.id).toContain('drop-shadow');
			expect(overflow, story.id).toBe('visible');
			expect(ring.replaceAll(/\s/g, ''), story.id).toContain(
				story.expectedRingChannel,
			);
		}
	});
});
