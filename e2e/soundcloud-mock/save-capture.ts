import { expect, type CDPSession, type Page } from '@playwright/test';

const STORE_KEY = '__likesToGoE2eSaveCapture';

export interface SavedExportCapture {
	readonly filename: string;
	readonly body: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isSavedExportCapture(value: unknown): value is SavedExportCapture {
	if (!isRecord(value)) {
		return false;
	}

	if (!('filename' in value) || !('body' in value)) {
		return false;
	}

	return (
		typeof value['filename'] === 'string' && typeof value['body'] === 'string'
	);
}

function readSavedExportRecords(value: unknown): readonly SavedExportCapture[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter(isSavedExportCapture);
}

function readIsolatedContextId(value: unknown): number | undefined {
	if (!isRecord(value) || !('context' in value)) {
		return undefined;
	}

	const context = value['context'];
	if (
		!isRecord(context) ||
		!('id' in context) ||
		typeof context['id'] !== 'number'
	) {
		return undefined;
	}

	if ('auxData' in context && isRecord(context['auxData'])) {
		const isDefault = context['auxData']['isDefault'];
		if (isDefault === true) {
			return undefined;
		}
	}

	return context['id'];
}

function readEvaluateReturnedValue(value: unknown): unknown {
	if (!isRecord(value)) {
		return undefined;
	}

	if ('exceptionDetails' in value && value['exceptionDetails'] !== undefined) {
		return undefined;
	}

	if (!('result' in value) || !isRecord(value['result'])) {
		return undefined;
	}

	return value['result']['value'];
}

const INSTALL_EXPRESSION = `(function () {
	const key = ${JSON.stringify(STORE_KEY)};
	const existing = Reflect.get(globalThis, key);
	if (
		typeof existing === 'object' &&
		existing !== null &&
		'installed' in existing &&
		existing.installed === true
	) {
		return;
	}
	const store = { installed: true, records: [] };
	Reflect.set(globalThis, key, store);
	Reflect.set(globalThis, 'showSaveFilePicker', async function (options) {
		const filename =
			options &&
			typeof options === 'object' &&
			'suggestedName' in options &&
			typeof options.suggestedName === 'string'
				? options.suggestedName
				: '';
		const chunks = [];
		return {
			createWritable: async function () {
				return {
					write: async function (data) {
						chunks.push(data);
					},
					close: async function () {
						let body = '';
						for (const chunk of chunks) {
							if (typeof chunk === 'string') {
								body += chunk;
							}
						}
						store.records.push({ filename: filename, body: body });
					},
				};
			},
		};
	});
})()`;

const READ_EXPRESSION = `(function () {
	const store = Reflect.get(globalThis, ${JSON.stringify(STORE_KEY)});
	if (typeof store !== 'object' || store === null || !('records' in store)) {
		return [];
	}
	return store.records;
})()`;

export interface SaveCaptureHandle {
	readonly page: Page;
	readonly dispose: () => Promise<void>;
	readonly readRecords: () => Promise<readonly SavedExportCapture[]>;
}

export async function installSaveCapture(
	page: Page,
): Promise<SaveCaptureHandle> {
	const session: CDPSession = await page.context().newCDPSession(page);
	const isolatedIds = new Set<number>();

	const injectContext = async (contextId: number): Promise<void> => {
		await session.send('Runtime.evaluate', {
			expression: INSTALL_EXPRESSION,
			contextId,
		});
	};

	session.on('Runtime.executionContextCreated', (event: unknown) => {
		const contextId = readIsolatedContextId(event);
		if (contextId === undefined) {
			return;
		}
		isolatedIds.add(contextId);
		void injectContext(contextId);
	});

	await session.send('Runtime.enable');
	await page.evaluate(INSTALL_EXPRESSION);

	for (const contextId of isolatedIds) {
		await injectContext(contextId);
	}

	const readRecords = async (): Promise<readonly SavedExportCapture[]> => {
		const fromPage: unknown = await page.evaluate(READ_EXPRESSION);
		const merged: SavedExportCapture[] = [...readSavedExportRecords(fromPage)];

		for (const contextId of isolatedIds) {
			try {
				const evaluated: unknown = await session.send('Runtime.evaluate', {
					expression: READ_EXPRESSION,
					returnByValue: true,
					contextId,
				});
				merged.push(
					...readSavedExportRecords(readEvaluateReturnedValue(evaluated)),
				);
			} catch {
				continue;
			}
		}

		return merged;
	};

	return {
		page,
		readRecords,
		dispose: async () => {
			await session.detach();
		},
	};
}

export async function waitForCapturedSave(
	capture: SaveCaptureHandle,
): Promise<SavedExportCapture> {
	let captured: SavedExportCapture | undefined;

	await expect
		.poll(async () => {
			const records = await capture.readRecords();
			const match = records[0];
			if (match === undefined) {
				return false;
			}
			captured = match;
			return true;
		})
		.toBe(true);

	if (captured === undefined) {
		throw new Error('Save capture poll completed without a record');
	}

	return captured;
}

export function decodeSavedExportJson(body: string): unknown {
	const parsed: unknown = JSON.parse(body);
	return parsed;
}

export async function startSyntheticSave(
	capture: SaveCaptureHandle,
	jsonString: string,
	filename: string,
): Promise<void> {
	const encodedJson = JSON.stringify(jsonString);
	const encodedName = JSON.stringify(filename);
	const expression = `(async function () {
		const handle = await globalThis.showSaveFilePicker({
			suggestedName: ${encodedName},
		});
		const writable = await handle.createWritable();
		await writable.write(${encodedJson});
		await writable.close();
	})()`;

	await capture.page.evaluate(expression);
}
