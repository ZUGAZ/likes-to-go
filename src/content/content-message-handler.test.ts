import { parseRequestMessage } from '@/common/infrastructure/parse-request-message';
import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
import {
	isCollectionError,
	isLoginRequired,
	StartCollectionRequest,
} from '@/common/model/request-message';
import { createContentMessageHandler } from '@/content/content-message-handler';
import { Either, ManagedRuntime, Runtime } from 'effect';
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import { silentLoggerLayer } from '@/test/effect-log-test';

describe('createContentMessageHandler', () => {
	let managed: ManagedRuntime.ManagedRuntime<never, never>;
	let runtime: Runtime.Runtime<never>;

	const sendMessageMock = vi.fn((message: unknown) => {
		void message;
		return Promise.resolve(undefined);
	});

	beforeAll(async () => {
		managed = ManagedRuntime.make(silentLoggerLayer);
		runtime = await managed.runtime();
	});

	afterAll(async () => {
		await managed.dispose();
	});

	beforeEach(() => {
		sendMessageMock.mockReset();
		sendMessageMock.mockImplementation(() => Promise.resolve(undefined));

		Object.defineProperty(globalThis, 'chrome', {
			configurable: true,
			writable: true,
			value: {
				runtime: {
					sendMessage: sendMessageMock,
				},
			},
		});
	});

	afterEach(() => {
		document.documentElement.innerHTML = '';
	});

	const ctx = {
		isValid: true,
		onInvalidated: () => () => {},
	};

	it('returns false for invalid message payload', () => {
		document.body.innerHTML =
			'<div class="lazyLoadingList__list"><ul></ul></div>';
		const handler = createContentMessageHandler(runtime, ctx);
		const sendResponse = vi.fn();
		const handled = handler(
			{ _tag: 'Nope' },
			{} as chrome.runtime.MessageSender,
			sendResponse,
		);
		expect(handled).toBe(false);
		expect(sendMessageMock).not.toHaveBeenCalled();
	});

	it('sends LoginRequiredRequest when track list exists but user nav is absent', async () => {
		document.body.innerHTML =
			'<div class="lazyLoadingList__list"><ul><li>card</li></ul></div>';

		const handler = createContentMessageHandler(runtime, ctx);
		const sendResponse = vi.fn();

		const handled = handler(
			StartCollectionRequest(),
			{} as chrome.runtime.MessageSender,
			sendResponse,
		);

		expect(handled).toBe(true);
		await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledTimes(1));

		expect(sendMessageMock).toHaveBeenCalledTimes(1);
		const rawLogin = sendMessageMock.mock.calls[0]?.[0];
		const loginParsed = parseRequestMessage(rawLogin);
		expect(Either.isRight(loginParsed)).toBe(true);
		if (Either.isLeft(loginParsed)) return;
		expect(isLoginRequired(loginParsed.right)).toBe(true);
		if (!isLoginRequired(loginParsed.right)) return;
		expect(loginParsed.right.message).toBe(LOGIN_REQUIRED_MESSAGE);
		expect(loginParsed.right.reason).toBe(
			'User nav selector not found in page DOM',
		);
	});

	it('sends CollectionErrorRequest when track list container is missing', async () => {
		document.body.innerHTML = '<div>No list</div>';

		const handler = createContentMessageHandler(runtime, ctx);
		const sendResponse = vi.fn();

		const handled = handler(
			StartCollectionRequest(),
			{} as chrome.runtime.MessageSender,
			sendResponse,
		);

		expect(handled).toBe(true);
		await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledTimes(1));

		expect(sendMessageMock).toHaveBeenCalledTimes(1);
		const rawErr = sendMessageMock.mock.calls[0]?.[0];
		const errParsed = parseRequestMessage(rawErr);
		expect(Either.isRight(errParsed)).toBe(true);
		if (Either.isLeft(errParsed)) return;
		expect(isCollectionError(errParsed.right)).toBe(true);
		if (!isCollectionError(errParsed.right)) return;
		expect(errParsed.right.message).toBe('Track list not found on page');
		expect(errParsed.right.reason).toContain('selector');
	});
});
