import {
	dispatchEffect,
	handleMessageEffect,
} from '@/background/background-dispatch';
import { handleCollectionTabNavigationEffect } from '@/background/collection-tab-navigation';
import { CommandRunnerTag } from '@/background/command-runner';
import { CollectionStateStorageNoop } from '@/background/infrastructure/collection-state-storage';
import {
	ContentOverlaySurface,
	defaultMascotUiSurface,
	ExtensionPopupSurface,
	getMascotUiSurfaceEffect,
	MascotUiSurfaceRefTag,
} from '@/background/mascot-ui-surface';
import {
	defaultOverlayHandoff,
	OverlayHandoffRefTag,
	PopupPortCountRefTag,
} from '@/background/overlay-handoff';
import { StateRefTag } from '@/background/state-ref';
import { CollectionTabSelected } from '@/common/model/collection/events/collection-tab-selected';
import { COLLECTION_SOURCE_INVALIDATED_MESSAGE } from '@/common/model/collection/events/collection-source-invalidated';
import { CollectionComplete } from '@/common/model/collection/events/collection-complete';
import { LoginRequired } from '@/common/model/collection/events/login-required';
import { LoginVerified } from '@/common/model/collection/events/login-verified';
import { SourceSelected } from '@/common/model/collection/events/source-selected';
import { StartCollection } from '@/common/model/collection/events/start-collection';
import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
import { isCollecting } from '@/common/model/collection/states/collecting';
import { isErrorState } from '@/common/model/collection/states/error-state';
import { initialCollectionState } from '@/common/model/collection/transition';
import {
	CancelCollectionRequest,
	GetStateRequest,
	isShowMascot,
	ShowMascotRequest,
	StartCollectionRequest,
	type GetStateResponse,
} from '@/common/model/request-message';
import type { Source } from '@/common/model/source';
import { isSoundCloudUrl } from '@/common/model/url/is-soundcloud-url';
import { silentLoggerLayer } from '@/test/effect-log-test';
import { Effect, Layer, Ref } from 'effect';
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
	queryTabs: (queryInfo: chrome.tabs.QueryInfo) => Promise<readonly TestTab[]>,
): Layer.Layer<CommandRunnerTag> {
	return Layer.succeed(CommandRunnerTag, {
		run: (cmd) => {
			recordedCommands.push({ ...cmd });
			if (cmd._tag === 'CheckSource') {
				return Effect.promise(() =>
					queryTabs({
						active: true,
						currentWindow: true,
					}),
				).pipe(
					Effect.flatMap((tabs) =>
						dispatchEffect(SourceSelected({ source: tabsToSource(tabs) })),
					),
				);
			}
			if (cmd._tag !== 'CheckLogin') {
				return Effect.void;
			}
			return Effect.promise(() =>
				getCookie({
					url: 'https://soundcloud.com',
					name: 'oauth_token',
				}),
			).pipe(
				Effect.flatMap((cookie) =>
					cookie === null
						? dispatchEffect(
								LoginRequired({
									message: LOGIN_REQUIRED_MESSAGE,
									reason: 'Missing login cookie',
								}),
							)
						: dispatchEffect(LoginVerified()),
				),
			);
		},
	});
}

type TestTab = {
	readonly id?: number;
	readonly url?: string;
};

function tabsToSource(tabs: readonly TestTab[]): Source {
	return isSoundCloudUrl(tabs[0]?.url) ? 'active-soundcloud-tab' : 'likes-page';
}

function makeMascotSessionRefLayer(
	popupPortCount = 0,
): Layer.Layer<
	MascotUiSurfaceRefTag | OverlayHandoffRefTag | PopupPortCountRefTag
> {
	return Layer.mergeAll(
		Layer.effect(MascotUiSurfaceRefTag, Ref.make(defaultMascotUiSurface())),
		Layer.effect(OverlayHandoffRefTag, Ref.make(defaultOverlayHandoff())),
		Layer.effect(PopupPortCountRefTag, Ref.make(popupPortCount)),
	);
}

describe('background dispatch', () => {
	type GetCookie = (details: {
		readonly url: string;
		readonly name: string;
	}) => Promise<chrome.cookies.Cookie | null>;
	type QueryTabs = (queryInfo: chrome.tabs.QueryInfo) => Promise<TestTab[]>;
	type SendTabMessage = (tabId: number, message: unknown) => Promise<unknown>;
	const getCookieMock = vi.fn<GetCookie>();
	const queryTabsMock = vi.fn<QueryTabs>();
	const sendTabMessageMock = vi.fn<SendTabMessage>();

	beforeEach(() => {
		getCookieMock.mockReset();
		queryTabsMock.mockReset();
		sendTabMessageMock.mockReset();
		sendTabMessageMock.mockResolvedValue(undefined);
		getCookieMock.mockResolvedValue({
			domain: 'soundcloud.com',
			expirationDate: 1,
			hostOnly: false,
			httpOnly: true,
			name: 'oauth_token',
			path: '/',
			sameSite: 'no_restriction',
			secure: true,
			session: false,
			storeId: '0',
			value: 'session',
		});
		queryTabsMock.mockResolvedValue([
			{
				id: 1,
				url: 'https://example.com',
			},
		]);

		Object.defineProperty(globalThis, 'chrome', {
			configurable: true,
			writable: true,
			value: {
				cookies: {
					get: getCookieMock,
				},
				tabs: {
					query: queryTabsMock,
					sendMessage: sendTabMessageMock,
				},
			},
		});
	});

	it('dispatchEffect(StartCollection) emits CheckLogin, then LoginVerified selects a tab; CollectionTabSelected yields Collecting', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const stateRefLayer = Layer.effect(
			StateRefTag,
			Ref.make(initialCollectionState),
		);
		const runnerLayer = makeStubCommandRunner(recordedCommands);
		const testLayer = Layer.mergeAll(
			stateRefLayer,
			makeMascotSessionRefLayer(),
			runnerLayer,
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);

		const program = Effect.gen(function* () {
			yield* dispatchEffect(StartCollection());
			yield* dispatchEffect(LoginVerified());
			yield* dispatchEffect(
				CollectionTabSelected({
					sourceUrl: 'https://soundcloud.com/artist/track',
					tabId: 42,
				}),
			);
			const ref = yield* StateRefTag;
			return yield* Ref.get(ref);
		}).pipe(Effect.provide(testLayer));

		const state = await Effect.runPromise(program);

		// StartCollection -> [NotifyPopup, CheckLogin]
		// LoginVerified -> [SelectCollectionTab]
		// CollectionTabSelected -> [NotifyPopup, SendStartToTab]
		// Total: 5
		expect(recordedCommands.length).toBe(5);
		expect(recordedCommands[0]).toMatchObject({ _tag: 'NotifyPopup' });
		expect(recordedCommands[1]).toMatchObject({
			_tag: 'CheckLogin',
		});
		expect(recordedCommands[2]).toMatchObject({
			_tag: 'SelectCollectionTab',
		});
		expect(recordedCommands[3]).toMatchObject({ _tag: 'NotifyPopup' });
		expect(recordedCommands[4]).toMatchObject({
			_tag: 'SendStartToTab',
			tabId: 42,
		});

		expect(isCollecting(state)).toBe(true);
		if (isCollecting(state)) {
			expect(state.tabId).toBe(42);
			expect(state.sourceUrl).toBe('https://soundcloud.com/artist/track');
			expect(state.tracks).toEqual([]);
		}
	});

	it('handleCollectionTabNavigationEffect cancels when the active collection tab navigates away', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const stateRefLayer = Layer.effect(
			StateRefTag,
			Ref.make(initialCollectionState),
		);
		const runnerLayer = makeStubCommandRunner(recordedCommands);
		const testLayer = Layer.mergeAll(
			stateRefLayer,
			makeMascotSessionRefLayer(),
			runnerLayer,
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);

		const program = Effect.gen(function* () {
			yield* dispatchEffect(StartCollection());
			yield* dispatchEffect(
				CollectionTabSelected({
					sourceUrl: 'https://soundcloud.com/artist/track',
					tabId: 42,
				}),
			);
			yield* handleCollectionTabNavigationEffect(42, 'https://example.com');
			const ref = yield* StateRefTag;
			return yield* Ref.get(ref);
		}).pipe(Effect.provide(testLayer));

		const state = await Effect.runPromise(program);

		expect(state).toMatchObject({
			_tag: 'Error',
			message: COLLECTION_SOURCE_INVALIDATED_MESSAGE,
		});
		expect(recordedCommands.map((command) => command._tag)).toEqual([
			'NotifyPopup',
			'CheckLogin',
			'NotifyPopup',
			'SendStartToTab',
			'SendCancelToTab',
			'NotifyPopup',
		]);
	});

	it('handleMessageEffect(GetStateRequest) preserves navigation error after tab navigates away', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const stateRefLayer = Layer.effect(
			StateRefTag,
			Ref.make(initialCollectionState),
		);
		const runnerLayer = makeCheckLoginAwareRunner(
			recordedCommands,
			getCookieMock,
			queryTabsMock,
		);
		const testLayer = Layer.mergeAll(
			stateRefLayer,
			makeMascotSessionRefLayer(),
			runnerLayer,
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);

		const program = Effect.gen(function* () {
			yield* dispatchEffect(StartCollection());
			yield* dispatchEffect(
				CollectionTabSelected({
					sourceUrl: 'https://soundcloud.com/artist/track',
					tabId: 42,
				}),
			);
			yield* handleCollectionTabNavigationEffect(42, 'https://example.com');
			const response = yield* handleMessageEffect(
				GetStateRequest(),
				{} as chrome.runtime.MessageSender,
			);
			const ref = yield* StateRefTag;
			const state = yield* Ref.get(ref);
			return { response, state };
		}).pipe(Effect.provide(testLayer));

		const { response, state } = await Effect.runPromise(program);

		expect(response).toMatchObject({
			status: 'error',
			trackCount: 0,
			message: COLLECTION_SOURCE_INVALIDATED_MESSAGE,
		});
		expect(isErrorState(state)).toBe(true);
		if (isErrorState(state)) {
			expect(state.message).toBe(COLLECTION_SOURCE_INVALIDATED_MESSAGE);
		}
	});

	it('CancelCollection after navigation error returns idle on GetState', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const stateRefLayer = Layer.effect(
			StateRefTag,
			Ref.make(initialCollectionState),
		);
		const runnerLayer = makeCheckLoginAwareRunner(
			recordedCommands,
			getCookieMock,
			queryTabsMock,
		);
		const testLayer = Layer.mergeAll(
			stateRefLayer,
			makeMascotSessionRefLayer(),
			runnerLayer,
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);
		const sender: chrome.runtime.MessageSender = {};

		const program = Effect.gen(function* () {
			yield* dispatchEffect(StartCollection());
			yield* dispatchEffect(
				CollectionTabSelected({
					sourceUrl: 'https://soundcloud.com/artist/track',
					tabId: 42,
				}),
			);
			yield* handleCollectionTabNavigationEffect(42, 'https://example.com');
			yield* handleMessageEffect(CancelCollectionRequest(), sender);
			const response = yield* handleMessageEffect(GetStateRequest(), sender);
			const ref = yield* StateRefTag;
			const state = yield* Ref.get(ref);
			return { response, state };
		}).pipe(Effect.provide(testLayer));

		const { response, state } = await Effect.runPromise(program);

		expect(response).toMatchObject({
			status: 'idle',
			trackCount: 0,
			source: 'likes-page',
		});
		expect(state).toMatchObject({ _tag: 'Idle' });
	});

	it('handleCollectionTabNavigationEffect ignores same-url updates and other tabs', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const stateRefLayer = Layer.effect(
			StateRefTag,
			Ref.make(initialCollectionState),
		);
		const runnerLayer = makeStubCommandRunner(recordedCommands);
		const testLayer = Layer.mergeAll(
			stateRefLayer,
			makeMascotSessionRefLayer(),
			runnerLayer,
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);

		const program = Effect.gen(function* () {
			yield* dispatchEffect(StartCollection());
			yield* dispatchEffect(
				CollectionTabSelected({
					sourceUrl: 'https://soundcloud.com/artist/track',
					tabId: 42,
				}),
			);
			yield* handleCollectionTabNavigationEffect(
				42,
				'https://soundcloud.com/artist/track',
			);
			yield* handleCollectionTabNavigationEffect(43, 'https://example.com');
			const ref = yield* StateRefTag;
			return yield* Ref.get(ref);
		}).pipe(Effect.provide(testLayer));

		const state = await Effect.runPromise(program);

		expect(isCollecting(state)).toBe(true);
		expect(recordedCommands.map((command) => command._tag)).toEqual([
			'NotifyPopup',
			'CheckLogin',
			'NotifyPopup',
			'SendStartToTab',
		]);
	});

	it('handleCollectionTabNavigationEffect ignores navigation after normal completion', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const stateRefLayer = Layer.effect(
			StateRefTag,
			Ref.make(initialCollectionState),
		);
		const runnerLayer = makeStubCommandRunner(recordedCommands);
		const testLayer = Layer.mergeAll(
			stateRefLayer,
			makeMascotSessionRefLayer(),
			runnerLayer,
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);

		const program = Effect.gen(function* () {
			yield* dispatchEffect(StartCollection());
			yield* dispatchEffect(
				CollectionTabSelected({
					sourceUrl: 'https://soundcloud.com/artist/track',
					tabId: 42,
				}),
			);
			yield* dispatchEffect(CollectionComplete());
			yield* handleCollectionTabNavigationEffect(42, 'https://example.com');
			const ref = yield* StateRefTag;
			return yield* Ref.get(ref);
		}).pipe(Effect.provide(testLayer));

		const state = await Effect.runPromise(program);

		expect(state).toMatchObject({ _tag: 'Done' });
		expect(recordedCommands.map((command) => command._tag)).toEqual([
			'NotifyPopup',
			'CheckLogin',
			'NotifyPopup',
			'SendStartToTab',
			'NotifyPopup',
		]);
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
			queryTabsMock,
		);
		const testLayer = Layer.mergeAll(
			stateRefLayer,
			makeMascotSessionRefLayer(),
			runnerLayer,
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);

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
						source: 'likes-page',
					});
				}),
			),
		);

		await Effect.runPromise(program);

		expect(recordedCommands.map((command) => command._tag)).toEqual([
			'CheckSource',
			'CheckLogin',
		]);
	});

	it('handleMessageEffect(GetStateRequest) reports active SoundCloud tab source', async () => {
		queryTabsMock.mockResolvedValueOnce([
			{
				id: 1,
				url: 'https://soundcloud.com/artist/track',
			},
		]);
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const stateRefLayer = Layer.effect(
			StateRefTag,
			Ref.make(initialCollectionState),
		);
		const runnerLayer = makeCheckLoginAwareRunner(
			recordedCommands,
			getCookieMock,
			queryTabsMock,
		);
		const testLayer = Layer.mergeAll(
			stateRefLayer,
			makeMascotSessionRefLayer(),
			runnerLayer,
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);
		const sender: chrome.runtime.MessageSender = {};

		const response = await Effect.runPromise(
			handleMessageEffect(GetStateRequest(), sender).pipe(
				Effect.provide(testLayer),
			),
		);

		expect(response).toMatchObject({
			status: 'idle',
			trackCount: 0,
			source: 'active-soundcloud-tab',
		});
		expect(queryTabsMock).toHaveBeenCalledWith({
			active: true,
			currentWindow: true,
		});
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
			queryTabsMock,
		);
		const testLayer = Layer.mergeAll(
			stateRefLayer,
			makeMascotSessionRefLayer(),
			runnerLayer,
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);

		const response = await Effect.runPromise(
			handleMessageEffect(
				GetStateRequest(),
				{} as chrome.runtime.MessageSender,
			).pipe(Effect.provide(testLayer)),
		);

		expect(response).toMatchObject({
			status: 'login-required',
			trackCount: 0,
			message: LOGIN_REQUIRED_MESSAGE,
		});
		expect(recordedCommands.map((command) => command._tag)).toEqual([
			'CheckSource',
			'CheckLogin',
			'NotifyPopup',
		]);
	});

	it('handleMessageEffect(StartCollectionRequest) dispatches and returns state while checking login', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const stateRefLayer = Layer.effect(
			StateRefTag,
			Ref.make(initialCollectionState),
		);
		const runnerLayer = makeStubCommandRunner(recordedCommands);
		const testLayer = Layer.mergeAll(
			stateRefLayer,
			makeMascotSessionRefLayer(),
			runnerLayer,
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);

		const program = handleMessageEffect(
			StartCollectionRequest(),
			{} as chrome.runtime.MessageSender,
		).pipe(
			Effect.provide(testLayer),
			Effect.tap((response: GetStateResponse) =>
				Effect.sync(() => {
					expect(response).toMatchObject({
						status: 'checking-login',
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

	it('reveals the likes-tab overlay after a popup-started export when the popup is gone', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const testLayer = Layer.mergeAll(
			Layer.effect(StateRefTag, Ref.make(initialCollectionState)),
			makeMascotSessionRefLayer(0),
			makeStubCommandRunner(recordedCommands),
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);

		const program = Effect.gen(function* () {
			yield* handleMessageEffect(
				StartCollectionRequest(),
				{} as chrome.runtime.MessageSender,
			);
			yield* dispatchEffect(
				CollectionTabSelected({
					sourceUrl: 'https://soundcloud.com/you/likes',
					tabId: 42,
				}),
			);
			return yield* getMascotUiSurfaceEffect();
		}).pipe(Effect.provide(testLayer));

		const surface = await Effect.runPromise(program);

		expect(surface).toEqual(ContentOverlaySurface({ tabId: 42 }));
		expect(sendTabMessageMock).toHaveBeenCalledWith(42, ShowMascotRequest());
	});

	it('reveals after a popup-as-tab export when that extension page closes', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const testLayer = Layer.mergeAll(
			Layer.effect(StateRefTag, Ref.make(initialCollectionState)),
			makeMascotSessionRefLayer(0),
			makeStubCommandRunner(recordedCommands),
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);

		const program = Effect.gen(function* () {
			yield* handleMessageEffect(StartCollectionRequest(), {
				url: 'chrome-extension://id/popup.html',
				tab: {
					id: 99,
					url: 'chrome-extension://id/popup.html',
				} as chrome.tabs.Tab,
			});
			yield* dispatchEffect(
				CollectionTabSelected({
					sourceUrl: 'https://soundcloud.com/you/likes',
					tabId: 42,
				}),
			);
			return yield* getMascotUiSurfaceEffect();
		}).pipe(Effect.provide(testLayer));

		const surface = await Effect.runPromise(program);

		expect(surface).toEqual(ContentOverlaySurface({ tabId: 42 }));
		expect(sendTabMessageMock).toHaveBeenCalledWith(42, ShowMascotRequest());
	});

	it('does not auto-show the overlay when the popup is still open', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const testLayer = Layer.mergeAll(
			Layer.effect(StateRefTag, Ref.make(initialCollectionState)),
			makeMascotSessionRefLayer(1),
			makeStubCommandRunner(recordedCommands),
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);

		await Effect.runPromise(
			Effect.gen(function* () {
				yield* handleMessageEffect(
					StartCollectionRequest(),
					{} as chrome.runtime.MessageSender,
				);
				yield* dispatchEffect(
					CollectionTabSelected({
						sourceUrl: 'https://soundcloud.com/you/likes',
						tabId: 42,
					}),
				);
			}).pipe(Effect.provide(testLayer)),
		);

		expect(sendTabMessageMock).not.toHaveBeenCalled();
	});

	it('keeps popup notify surface when overlay GetState arrives while the popup is open', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const testLayer = Layer.mergeAll(
			Layer.effect(StateRefTag, Ref.make(initialCollectionState)),
			makeMascotSessionRefLayer(1),
			makeStubCommandRunner(recordedCommands),
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);

		const surface = await Effect.runPromise(
			Effect.gen(function* () {
				yield* handleMessageEffect(
					StartCollectionRequest(),
					{} as chrome.runtime.MessageSender,
				);
				yield* handleMessageEffect(GetStateRequest(), {
					tab: { id: 42 } as chrome.tabs.Tab,
				});
				return yield* getMascotUiSurfaceEffect();
			}).pipe(Effect.provide(testLayer)),
		);

		expect(surface).toEqual(ExtensionPopupSurface());
		expect(sendTabMessageMock).not.toHaveBeenCalled();
	});

	it('does not steal overlay notify surface when popup GetState arrives mid-run', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const testLayer = Layer.mergeAll(
			Layer.effect(StateRefTag, Ref.make(initialCollectionState)),
			makeMascotSessionRefLayer(0),
			makeStubCommandRunner(recordedCommands),
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);

		const surface = await Effect.runPromise(
			Effect.gen(function* () {
				yield* handleMessageEffect(StartCollectionRequest(), {
					tab: { id: 42 } as chrome.tabs.Tab,
				});
				yield* handleMessageEffect(
					GetStateRequest(),
					{} as chrome.runtime.MessageSender,
				);
				return yield* getMascotUiSurfaceEffect();
			}).pipe(Effect.provide(testLayer)),
		);

		expect(surface).toEqual(ContentOverlaySurface({ tabId: 42 }));
	});

	it('does not auto-show the overlay for an overlay-started export', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const testLayer = Layer.mergeAll(
			Layer.effect(StateRefTag, Ref.make(initialCollectionState)),
			makeMascotSessionRefLayer(0),
			makeStubCommandRunner(recordedCommands),
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);

		await Effect.runPromise(
			Effect.gen(function* () {
				yield* handleMessageEffect(StartCollectionRequest(), {
					tab: { id: 42 } as chrome.tabs.Tab,
				});
				yield* dispatchEffect(
					CollectionTabSelected({
						sourceUrl: 'https://soundcloud.com/you/likes',
						tabId: 42,
					}),
				);
			}).pipe(Effect.provide(testLayer)),
		);

		expect(
			sendTabMessageMock.mock.calls.filter((call) => isShowMascot(call[1])),
		).toEqual([]);
	});

	it('does not re-summon the overlay after it was already revealed', async () => {
		const recordedCommands: Array<{ _tag: string; [k: string]: unknown }> = [];
		const testLayer = Layer.mergeAll(
			Layer.effect(StateRefTag, Ref.make(initialCollectionState)),
			makeMascotSessionRefLayer(0),
			makeStubCommandRunner(recordedCommands),
			CollectionStateStorageNoop,
			silentLoggerLayer,
		);

		await Effect.runPromise(
			Effect.gen(function* () {
				yield* handleMessageEffect(
					StartCollectionRequest(),
					{} as chrome.runtime.MessageSender,
				);
				yield* dispatchEffect(
					CollectionTabSelected({
						sourceUrl: 'https://soundcloud.com/you/likes',
						tabId: 42,
					}),
				);
				sendTabMessageMock.mockClear();
				yield* dispatchEffect(CollectionComplete());
			}).pipe(Effect.provide(testLayer)),
		);

		expect(
			sendTabMessageMock.mock.calls.filter((call) => isShowMascot(call[1])),
		).toEqual([]);
	});
});
