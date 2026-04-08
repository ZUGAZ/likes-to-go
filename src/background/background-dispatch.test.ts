import { Effect, Layer, Ref } from 'effect';
import { CommandRunnerTag } from '@/background/command-runner';
import { StateRefTag } from '@/background/state-ref';
import {
	dispatchEffect,
	handleMessageEffect,
} from '@/background/background-dispatch';
import { initialCollectionState } from '@/common/model/collection/transition';
import { isCollecting } from '@/common/model/collection/states/collecting';
import { StartCollection } from '@/common/model/collection/events/start-collection';
import { LoginRequired } from '@/common/model/collection/events/login-required';
import { LoginVerified } from '@/common/model/collection/events/login-verified';
import { TabCreated } from '@/common/model/collection/events/tab-created';
import {
	GetStateRequest,
	StartCollectionRequest,
	type GetStateResponse,
} from '@/common/model/request-message';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function makeStubCommandRunner(
	recordedCommands: Array<{ _tag: string; [k: string]: unknown }>,
): Layer.Layer<CommandRunnerTag> {
	return Layer.succeed(CommandRunnerTag, {
		run: (cmd) => {
			recordedCommands.push({ ...cmd });
			return Effect.void;
		},
	});
}

function makeCheckLoginAwareRunner(
	recordedCommands: Array<{ _tag: string; [k: string]: unknown }>,
	getCookie: (
		details: chrome.cookies.CookieDetails,
	) => Promise<chrome.cookies.Cookie | null>,
): Layer.Layer<CommandRunnerTag> {
	return Layer.succeed(CommandRunnerTag, {
		run: (cmd) => {
			recordedCommands.push({ ...cmd });
			if (cmd._tag !== 'CheckLogin') {
				return Effect.void;
			}
			return Effect.promise(() =>
				getCookie({
					url: 'https://soundcloud.com',
					name: '_soundcloud_session',
				}),
			).pipe(
				Effect.flatMap((cookie) =>
					cookie === null
						? dispatchEffect(
								LoginRequired({
									message: 'Please log in to SoundCloud, then try again.',
									reason: 'Missing login cookie',
								}),
							)
						: dispatchEffect(LoginVerified()),
				),
			);
		},
	});
}

describe('background dispatch', () => {
	type GetCookie = (details: {
		readonly url: string;
		readonly name: string;
	}) => Promise<chrome.cookies.Cookie | null>;
	const getCookieMock = vi.fn<GetCookie>();

	beforeEach(() => {
		getCookieMock.mockReset();
		getCookieMock.mockResolvedValue({
			domain: 'soundcloud.com',
			expirationDate: 1,
			hostOnly: false,
			httpOnly: true,
			name: '_soundcloud_session',
			path: '/',
			sameSite: 'no_restriction',
			secure: true,
			session: false,
			storeId: '0',
			value: 'session',
		});

		Object.defineProperty(globalThis, 'chrome', {
			configurable: true,
			writable: true,
			value: {
				cookies: {
					get: getCookieMock,
				},
			},
		});
	});

	it('dispatchEffect(StartCollection) emits CheckLogin, then LoginVerified emits CreateTab; TabCreated yields Collecting', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const stateRefLayer = Layer.effect(
			StateRefTag,
			Ref.make(initialCollectionState),
		);
		const runnerLayer = makeStubCommandRunner(recordedCommands);
		const testLayer = Layer.mergeAll(stateRefLayer, runnerLayer);

		const program = Effect.gen(function* () {
			yield* dispatchEffect(StartCollection());
			yield* dispatchEffect(LoginVerified());
			yield* dispatchEffect(TabCreated({ tabId: 42 }));
			const ref = yield* StateRefTag;
			return yield* Ref.get(ref);
		}).pipe(Effect.provide(testLayer));

		const state = await Effect.runPromise(program);

		// StartCollection -> [NotifyPopup, CheckLogin]
		// LoginVerified -> [CreateTab]
		// TabCreated -> [NotifyPopup]
		// Total: 4
		expect(recordedCommands.length).toBe(4);
		expect(recordedCommands[0]).toMatchObject({ _tag: 'NotifyPopup' });
		expect(recordedCommands[1]).toMatchObject({
			_tag: 'CheckLogin',
		});
		expect(recordedCommands[2]).toMatchObject({
			_tag: 'CreateTab',
			url: 'https://soundcloud.com/you/likes',
		});
		expect(recordedCommands[3]).toMatchObject({ _tag: 'NotifyPopup' });

		expect(isCollecting(state)).toBe(true);
		if (isCollecting(state)) {
			expect(state.tabId).toBe(42);
			expect(state.tracks).toEqual([]);
		}
	});

	it('handleMessageEffect(GetStateRequest) returns idle state when ref is Idle', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const stateRefLayer = Layer.effect(
			StateRefTag,
			Ref.make(initialCollectionState),
		);
		const runnerLayer = makeCheckLoginAwareRunner(
			recordedCommands,
			getCookieMock,
		);
		const testLayer = Layer.mergeAll(stateRefLayer, runnerLayer);

		const program = handleMessageEffect(
			GetStateRequest(),
			{} as chrome.runtime.MessageSender,
		).pipe(
			Effect.provide(testLayer),
			Effect.tap((response: GetStateResponse) =>
				Effect.sync(() => {
					expect(response).toMatchObject({
						status: 'idle',
						trackCount: 0,
					});
				}),
			),
		);

		await Effect.runPromise(program);

		expect(recordedCommands.length).toBe(1);
		expect(recordedCommands[0]).toMatchObject({ _tag: 'CheckLogin' });
	});

	it('handleMessageEffect(GetStateRequest) returns login error when cookie is missing', async () => {
		getCookieMock.mockResolvedValueOnce(null);
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const stateRefLayer = Layer.effect(
			StateRefTag,
			Ref.make(initialCollectionState),
		);
		const runnerLayer = makeCheckLoginAwareRunner(
			recordedCommands,
			getCookieMock,
		);
		const testLayer = Layer.mergeAll(stateRefLayer, runnerLayer);

		const response = await Effect.runPromise(
			handleMessageEffect(
				GetStateRequest(),
				{} as chrome.runtime.MessageSender,
			).pipe(Effect.provide(testLayer)),
		);

		expect(response).toMatchObject({
			status: 'error',
			trackCount: 0,
			errorMessage: 'Please log in to SoundCloud, then try again.',
		});
		expect(recordedCommands.map((command) => command._tag)).toEqual([
			'CheckLogin',
			'NotifyPopup',
		]);
	});

	it('handleMessageEffect(StartCollectionRequest) dispatches and returns state after runner yields TabCreated', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const stateRefLayer = Layer.effect(
			StateRefTag,
			Ref.make(initialCollectionState),
		);
		const runnerLayer = makeStubCommandRunner(recordedCommands);
		const testLayer = Layer.mergeAll(stateRefLayer, runnerLayer);

		const program = handleMessageEffect(
			StartCollectionRequest(),
			{} as chrome.runtime.MessageSender,
		).pipe(
			Effect.provide(testLayer),
			Effect.tap((response: GetStateResponse) =>
				Effect.sync(() => {
					expect(response).toMatchObject({
						status: 'collecting',
						trackCount: 0,
					});
				}),
			),
		);

		await Effect.runPromise(program);

		// StartCollection -> [NotifyPopup, CheckLogin]
		expect(recordedCommands.length).toBe(2);
		expect(recordedCommands[0]).toMatchObject({ _tag: 'NotifyPopup' });
		expect(recordedCommands[1]).toMatchObject({ _tag: 'CheckLogin' });
	});
});
