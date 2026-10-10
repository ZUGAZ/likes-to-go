import {
	attachConsoleOnFailure,
	installConsoleCapture,
} from './console-capture';
import { expect, test } from './export-fixture';
import { seedSoundCloudSessionCookie } from './soundcloud-mock/seed-session';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

test('background rpc port answers a watch and a refresh', async ({
	context,
	extensionId,
}, testInfo) => {
	await seedSoundCloudSessionCookie(context, 'playwright-background-rpc');

	const page = await context.newPage();
	const consoleCapture = installConsoleCapture(page);

	try {
		await page.goto(`chrome-extension://${extensionId}/popup.html`);
		const frames = await page.evaluate(async () => {
			const record = (value: unknown): value is Record<string, unknown> =>
				typeof value === 'object' && value !== null;
			const port = chrome.runtime.connect({ name: 'likes-to-go/background' });
			const waitFor = (predicate: (message: unknown) => boolean) =>
				new Promise<unknown>((resolve, reject) => {
					const timer = setTimeout(() => {
						reject(new Error('timed out waiting for an rpc frame'));
					}, 5_000);
					const onMessage = (message: unknown) => {
						if (!predicate(message)) {
							return;
						}
						clearTimeout(timer);
						port.onMessage.removeListener(onMessage);
						resolve(message);
					};
					port.onMessage.addListener(onMessage);
				});

			const chunkPromise = waitFor(
				(message) => record(message) && message['_tag'] === 'Chunk',
			);
			port.postMessage({
				_tag: 'Request',
				id: '1',
				tag: 'WatchCollectionState',
				payload: null,
				headers: [],
			});
			const chunk = await chunkPromise;
			port.postMessage({ _tag: 'Ack', requestId: '1' });

			const exitPromise = waitFor(
				(message) =>
					record(message) &&
					message['_tag'] === 'Exit' &&
					message['requestId'] === '2',
			);
			port.postMessage({
				_tag: 'Request',
				id: '2',
				tag: 'RefreshCollectionState',
				payload: null,
				headers: [],
			});
			const exitFrame = await exitPromise;
			return { chunk, exitFrame };
		});

		expect(isRecord(frames.chunk)).toBe(true);
		const values = isRecord(frames.chunk) ? frames.chunk['values'] : undefined;
		if (!Array.isArray(values)) {
			throw new Error('watch did not return a chunk');
		}
		const view: unknown = values[0];
		expect(isRecord(view)).toBe(true);
		if (isRecord(view)) {
			expect(view['status']).toBe('idle');
			expect(view['isCollectionTab']).toBe(false);
		}
		const exitFrame = frames.exitFrame;
		const exit = isRecord(exitFrame) ? exitFrame['exit'] : undefined;
		expect(isRecord(exit)).toBe(true);
		if (isRecord(exit)) {
			expect(exit['_tag']).toBe('Success');
		}
	} catch (error) {
		await attachConsoleOnFailure(testInfo, consoleCapture);
		throw error;
	}
});
