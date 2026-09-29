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

	test('done balloon fills the space above the mouth, then grows downward', async ({
		page,
	}) => {
		const baseUrl = storybookBaseUrl ?? 'http://127.0.0.1:6006';
		await page.setViewportSize({ width: 1280, height: 1000 });

		const openStory = async (storyId: string): Promise<void> => {
			await page.goto(`${baseUrl}/iframe.html?id=${storyId}`);
			await expect(page.locator('.beat-balloon')).toBeVisible();
		};

		const readGeometry = () =>
			page.evaluate(() => {
				const balloon = document.querySelector('.beat-balloon');
				const layout = document.querySelector('.beat-layout');
				const mascot = document.querySelector('.beat-mascot');
				if (
					!(balloon instanceof HTMLElement) ||
					!(layout instanceof HTMLElement) ||
					!(mascot instanceof HTMLElement)
				) {
					throw new Error('Beat layout is missing');
				}

				const balloonBox = balloon.getBoundingClientRect();
				const layoutBox = layout.getBoundingClientRect();
				const mascotBox = mascot.getBoundingClientRect();
				const balloonStyle = getComputedStyle(balloon);
				const cornerRadiusPx = Number.parseFloat(
					balloonStyle.borderTopRightRadius,
				);
				const bottomLeftRadiusPx = Number.parseFloat(
					balloonStyle.borderBottomLeftRadius,
				);
				const tailStyle = getComputedStyle(balloon, '::after');
				const ratio = Number.parseFloat(
					getComputedStyle(layout).getPropertyValue('--beat-mouth-art-ratio'),
				);
				const tailTop = Number.parseFloat(tailStyle.top);
				const tailHeight = Number.parseFloat(tailStyle.height);
				if (
					Number.isNaN(ratio) ||
					Number.isNaN(tailTop) ||
					Number.isNaN(tailHeight) ||
					Number.isNaN(cornerRadiusPx) ||
					Number.isNaN(bottomLeftRadiusPx)
				) {
					throw new Error('Balloon anchor metrics are missing');
				}

				const chips = [
					...document.querySelectorAll('.beat-balloon__format-chip'),
				].flatMap((chip) => {
					if (!(chip instanceof HTMLElement)) {
						return [];
					}
					const box = chip.getBoundingClientRect();
					return [{ top: box.top, bottom: box.bottom }];
				});

				return {
					balloonTop: balloonBox.top,
					balloonBottom: balloonBox.bottom,
					layoutTop: layoutBox.top,
					mouthY: mascotBox.top + mascotBox.height * ratio,
					tailTipY: balloonBox.top + tailTop + tailHeight / 2,
					tailBottomInset: balloonBox.height - (tailTop + tailHeight),
					position: balloonStyle.position,
					transform: balloonStyle.transform,
					cornerRadiusPx,
					bottomLeftRadiusPx,
					chips,
					viewportHeight: window.innerHeight,
				};
			});

		const expectTailOnMouth = (
			geometry: Awaited<ReturnType<typeof readGeometry>>,
			storyId: string,
		): void => {
			expect(geometry.position, storyId).toBe('relative');
			expect(geometry.bottomLeftRadiusPx, storyId).toBe(
				geometry.cornerRadiusPx,
			);
			expect(geometry.bottomLeftRadiusPx, storyId).toBeGreaterThan(0);
			expect(geometry.tailBottomInset, storyId).toBeGreaterThanOrEqual(
				geometry.cornerRadiusPx - 1,
			);
			expect(geometry.balloonTop, storyId).toBeGreaterThanOrEqual(0);
			expect(geometry.balloonTop, storyId).toBeGreaterThanOrEqual(
				geometry.layoutTop - 1,
			);
			expect(
				Math.abs(geometry.tailTipY - geometry.mouthY),
				storyId,
			).toBeLessThan(2);
			expect(geometry.balloonBottom, storyId).toBeLessThanOrEqual(
				geometry.viewportHeight,
			);
		};

		const expectFormatRowsInView = (
			geometry: Awaited<ReturnType<typeof readGeometry>>,
			storyId: string,
		): void => {
			expect(geometry.chips.length, storyId).toBeGreaterThan(0);
			for (const chip of geometry.chips) {
				expect(chip.top, storyId).toBeGreaterThanOrEqual(0);
				expect(chip.bottom, storyId).toBeLessThanOrEqual(
					geometry.viewportHeight,
				);
				expect(chip.top, storyId).toBeGreaterThanOrEqual(geometry.balloonTop);
			}
		};

		await openStory('mascot-beatview--initial');
		const initial = await readGeometry();
		expectTailOnMouth(initial, 'mascot-beatview--initial');
		expect(initial.balloonTop - initial.layoutTop).toBeGreaterThan(8);
		expect(initial.balloonBottom).toBeGreaterThan(
			initial.mouthY + initial.cornerRadiusPx - 2,
		);
		expect(initial.balloonBottom).toBeLessThan(
			initial.mouthY + initial.cornerRadiusPx + 12,
		);

		await openStory('mascot-beatview--done');
		const done = await readGeometry();
		expectTailOnMouth(done, 'mascot-beatview--done');
		expectFormatRowsInView(done, 'mascot-beatview--done');
		expect(done.balloonTop - done.layoutTop).toBeLessThan(2);
		expect(done.balloonBottom).toBeGreaterThan(done.mouthY + 16);
		expect(done.balloonTop - done.layoutTop).toBeLessThan(
			initial.balloonTop - initial.layoutTop,
		);
		expect(done.balloonBottom - done.layoutTop).toBeGreaterThan(
			initial.balloonBottom - initial.layoutTop,
		);

		await openStory('mascot-beatview--done-overlay');
		const overlay = await readGeometry();
		expectTailOnMouth(overlay, 'mascot-beatview--done-overlay');
		expectFormatRowsInView(overlay, 'mascot-beatview--done-overlay');
		expect(overlay.balloonTop - overlay.layoutTop).toBeLessThan(2);
		expect(overlay.balloonBottom).toBeGreaterThan(overlay.mouthY + 16);
	});
});
