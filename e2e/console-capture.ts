import type { Page, TestInfo } from '@playwright/test';

export interface ConsoleCapture {
	readonly flush: () => string;
}

export function installConsoleCapture(page: Page): ConsoleCapture {
	const lines: string[] = [];

	page.on('console', (message) => {
		lines.push(`[console.${message.type()}] ${message.text()}`);
	});

	page.on('pageerror', (error) => {
		lines.push(`[pageerror] ${error.message}`);
	});

	return {
		flush: () => lines.join('\n'),
	};
}

export async function attachConsoleOnFailure(
	testInfo: TestInfo,
	capture: ConsoleCapture,
): Promise<void> {
	const body = capture.flush();
	if (body.length === 0) {
		return;
	}

	await testInfo.attach('console-log', {
		body,
		contentType: 'text/plain',
	});
}
