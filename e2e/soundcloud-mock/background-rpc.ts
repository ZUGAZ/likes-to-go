import {
	expect,
	type BrowserContext,
	type Page,
	type Worker,
} from '@playwright/test';

import { GetStateRequest } from '@/common/model/request-message/request-message';
import type { CollectionStatus } from '@/common/model/request-message/get-state-response';
import { CONTENT_RPC_PORT_NAME } from '@/common/model/messaging/port-names';

const messengerPages = new WeakMap<BrowserContext, Promise<Page>>();

function isCollectionStatus(value: unknown): value is CollectionStatus {
	return (
		value === 'idle' ||
		value === 'checking-login' ||
		value === 'collecting' ||
		value === 'paused' ||
		value === 'done' ||
		value === 'saving' ||
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
	await worker.evaluate(
		async (payload: { tabId: number; portName: string }) => {
			const isRecord = (value: unknown): value is Record<string, unknown> =>
				typeof value === 'object' && value !== null;
			const port = chrome.tabs.connect(payload.tabId, {
				name: payload.portName,
				frameId: 0,
			});
			let settled = false;
			try {
				await new Promise<void>((resolve, reject) => {
					const timer = setTimeout(() => {
						if (settled) {
							return;
						}
						settled = true;
						reject(new Error('ToggleMascot exit timed out'));
					}, 1000);

					port.onMessage.addListener((message: unknown) => {
						if (
							settled ||
							!isRecord(message) ||
							message['_tag'] !== 'Exit' ||
							message['requestId'] !== '1' ||
							!isRecord(message['exit'])
						) {
							return;
						}
						settled = true;
						clearTimeout(timer);
						if (message['exit']['_tag'] === 'Success') {
							resolve();
							return;
						}
						reject(new Error('ToggleMascot exit was not Success'));
					});
					port.onDisconnect.addListener(() => {
						if (settled) {
							return;
						}
						settled = true;
						clearTimeout(timer);
						const reason = chrome.runtime.lastError?.message;
						reject(
							new Error(
								reason === undefined
									? 'ToggleMascot port disconnected'
									: reason,
							),
						);
					});
					port.postMessage({
						_tag: 'Request',
						id: '1',
						tag: 'ToggleMascot',
						payload: null,
						headers: [],
					});
				});
			} finally {
				port.disconnect();
			}
		},
		{ tabId, portName: CONTENT_RPC_PORT_NAME },
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
