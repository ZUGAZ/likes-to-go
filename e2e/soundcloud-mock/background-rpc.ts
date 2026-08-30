import {
	expect,
	type BrowserContext,
	type Page,
	type Worker,
} from '@playwright/test';

import { GetStateRequest } from '@/common/model/request-message/request-message';
import type { CollectionStatus } from '@/common/model/request-message/get-state-response';
import { ToggleMascotRequest } from '@/common/model/request-message/toggle-mascot';

const messengerPages = new WeakMap<BrowserContext, Promise<Page>>();

function isCollectionStatus(value: unknown): value is CollectionStatus {
	return (
		value === 'idle' ||
		value === 'checking-login' ||
		value === 'collecting' ||
		value === 'paused' ||
		value === 'done' ||
		value === 'login-required' ||
		value === 'error'
	);
}

function readCollectionStatus(value: unknown): CollectionStatus | undefined {
	if (typeof value !== 'object' || value === null || !('status' in value)) {
		return undefined;
	}

	return isCollectionStatus(value.status) ? value.status : undefined;
}

async function getExtensionMessengerPage(
	context: BrowserContext,
	extensionId: string,
): Promise<Page> {
	const existing = messengerPages.get(context);
	if (existing !== undefined) {
		return existing;
	}

	const created = (async () => {
		const page = await context.newPage();
		await page.goto(`chrome-extension://${extensionId}/popup.html`);
		return page;
	})();

	messengerPages.set(context, created);
	return created;
}

export async function waitForTabId(
	worker: Worker,
	url: string,
): Promise<number> {
	let tabId: number | undefined;

	await expect
		.poll(async () => {
			const found = await worker.evaluate(async (targetUrl) => {
				const tabs = await chrome.tabs.query({ url: targetUrl });
				const first = tabs[0];
				return first?.id ?? null;
			}, url);

			if (typeof found !== 'number') {
				return false;
			}

			tabId = found;
			return true;
		})
		.toBe(true);

	if (tabId === undefined) {
		throw new Error(`Extension tab id was not found for ${url}`);
	}

	return tabId;
}

async function sendToggleMascot(worker: Worker, tabId: number): Promise<void> {
	const request = ToggleMascotRequest();
	await worker.evaluate(
		async (payload: { tabId: number; tag: 'ToggleMascot' }) => {
			await chrome.tabs.sendMessage(payload.tabId, { _tag: payload.tag });
		},
		{ tabId, tag: request._tag },
	);
}

export async function toggleMascotOnTab(
	worker: Worker,
	tabId: number,
): Promise<void> {
	await expect
		.poll(async () => {
			try {
				await sendToggleMascot(worker, tabId);
				return true;
			} catch {
				return false;
			}
		})
		.toBe(true);
}

export async function sendGetState(
	context: BrowserContext,
	extensionId: string,
): Promise<unknown> {
	const request = GetStateRequest();
	const page = await getExtensionMessengerPage(context, extensionId);
	const response: unknown = await page.evaluate(
		async (message): Promise<unknown> => {
			const raw: unknown = await chrome.runtime.sendMessage(message);
			return raw;
		},
		{ _tag: request._tag },
	);
	return response;
}

export async function waitForGetStateStatus(
	context: BrowserContext,
	extensionId: string,
	status: CollectionStatus,
): Promise<unknown> {
	let last: unknown;

	await expect
		.poll(async () => {
			last = await sendGetState(context, extensionId);
			return readCollectionStatus(last);
		})
		.toBe(status);

	return last;
}
