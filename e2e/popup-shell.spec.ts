import {
	attachConsoleOnFailure,
	installConsoleCapture,
} from './console-capture';
import { expect, test } from './extension-fixture';
import { seedSoundCloudSessionCookie } from './soundcloud-mock/seed-session';

test('popup shell settles with Beat UI', async ({
	context,
	extensionId,
}, testInfo) => {
	await seedSoundCloudSessionCookie(context, 'playwright-shell-smoke');

	const page = await context.newPage();
	const consoleCapture = installConsoleCapture(page);

	try {
		await page.goto(`chrome-extension://${extensionId}/popup.html`);

		await expect(
			page.getByRole('heading', { name: 'Likes to Go', level: 1 }),
		).toBeVisible();
		await expect(page.locator('main.beat-root')).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Start export' }),
		).toBeVisible();

		await expect(page).toHaveTitle('Likes to Go');
		await expect(page.locator('.beat-balloon__copy')).not.toBeEmpty();
	} catch (error) {
		await attachConsoleOnFailure(testInfo, consoleCapture);
		throw error;
	}
});
