import { expect, type Worker } from '@playwright/test';

const CAPTURE_STORE_KEY = '__likesToGoE2eDownloadCapture';
const JSON_DATA_URL_PREFIX = 'data:application/json;base64,';

export interface DownloadCapture {
	readonly id: number;
	readonly url: string;
	readonly filename: string;
}

interface CaptureStore {
	readonly installed: boolean;
	readonly records: DownloadCapture[];
}

function isDownloadCapture(value: unknown): value is DownloadCapture {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	if (!('id' in value) || !('url' in value) || !('filename' in value)) {
		return false;
	}

	return (
		typeof value.id === 'number' &&
		typeof value.url === 'string' &&
		typeof value.filename === 'string'
	);
}

function readCaptureRecords(value: unknown): readonly DownloadCapture[] {
	if (typeof value !== 'object' || value === null || !('records' in value)) {
		return [];
	}

	const records = value.records;
	if (!Array.isArray(records)) {
		return [];
	}

	return records.filter(isDownloadCapture);
}

export async function installDownloadCapture(worker: Worker): Promise<void> {
	await worker.evaluate((storeKey) => {
		const existing: unknown = Reflect.get(globalThis, storeKey);
		if (
			typeof existing === 'object' &&
			existing !== null &&
			'installed' in existing &&
			existing.installed === true
		) {
			return;
		}

		const store: CaptureStore = {
			installed: true,
			records: [],
		};
		Reflect.set(globalThis, storeKey, store);

		// Cancel immediately so saveAs cannot open a native chooser. Chrome
		// often leaves item.filename empty at onCreated when saveAs is true.
		chrome.downloads.onCreated.addListener((item) => {
			store.records.push({
				id: item.id,
				url: item.url,
				filename: item.filename,
			});
			chrome.downloads.cancel(item.id, () => {
				void chrome.downloads.erase({ id: item.id });
			});
		});
	}, CAPTURE_STORE_KEY);
}

async function readCapturedDownloads(
	worker: Worker,
): Promise<readonly DownloadCapture[]> {
	const raw: unknown = await worker.evaluate((storeKey): unknown => {
		const value: unknown = Reflect.get(globalThis, storeKey);
		return value;
	}, CAPTURE_STORE_KEY);

	return readCaptureRecords(raw);
}

export async function waitForCapturedDownload(
	worker: Worker,
): Promise<DownloadCapture> {
	let captured: DownloadCapture | undefined;

	await expect
		.poll(async () => {
			const records = await readCapturedDownloads(worker);
			const match = records.find((record) =>
				record.url.startsWith(JSON_DATA_URL_PREFIX),
			);
			if (match === undefined) {
				return false;
			}
			captured = match;
			return true;
		})
		.toBe(true);

	if (captured === undefined) {
		throw new Error('Download capture poll completed without a record');
	}

	return captured;
}

export function decodeExportDataUrl(url: string): unknown {
	if (!url.startsWith(JSON_DATA_URL_PREFIX)) {
		throw new Error(`Expected JSON base64 data URL, got: ${url.slice(0, 80)}`);
	}

	const encoded = url.slice(JSON_DATA_URL_PREFIX.length);
	const parsed: unknown = JSON.parse(
		Buffer.from(encoded, 'base64').toString('utf8'),
	);
	return parsed;
}

export async function startJsonDataUrlDownload(
	worker: Worker,
	jsonString: string,
	filename: string,
): Promise<void> {
	const url = `${JSON_DATA_URL_PREFIX}${Buffer.from(jsonString, 'utf8').toString('base64')}`;
	const downloadId = await worker.evaluate(
		async (download: { url: string; filename: string }) => {
			return chrome.downloads.download({
				url: download.url,
				filename: download.filename,
				saveAs: true,
			});
		},
		{ url, filename },
	);

	if (typeof downloadId !== 'number') {
		throw new Error('chrome.downloads.download did not return an id');
	}
}
