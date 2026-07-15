import { beforeEach, describe, expect, layer } from '@effect/vitest';
import { Effect, Layer, Ref } from 'effect';
import { vi } from 'vitest';

import { runNotifyPopup } from '@/background/commands/run-notify-popup';
import {
	ContentOverlaySurface,
	defaultMascotUiSurface,
	ExtensionPopupSurface,
	MascotUiSurfaceRefTag,
} from '@/background/mascot-ui-surface';
import { Done } from '@/common/model/collection/states/done';
import { isPopupStateUpdate } from '@/common/model/request-message/popup-state-update';
import { silentLoggerLayer } from '@/test/effect-log-test';

describe('runNotifyPopup', () => {
	const sendRuntimeMessageMock = vi.fn<(message: unknown) => Promise<unknown>>();
	const sendTabMessageMock =
		vi.fn<(tabId: number, message: unknown) => Promise<unknown>>();

	const makeTestLayer = (surface = defaultMascotUiSurface()) =>
		Layer.mergeAll(
			Layer.effect(MascotUiSurfaceRefTag, Ref.make(surface)),
			silentLoggerLayer,
		);

	beforeEach(() => {
		vi.resetAllMocks();
		sendRuntimeMessageMock.mockResolvedValue(undefined);
		sendTabMessageMock.mockResolvedValue(undefined);

		Object.defineProperty(globalThis, 'chrome', {
			configurable: true,
			writable: true,
			value: {
				runtime: {
					sendMessage: sendRuntimeMessageMock,
				},
				tabs: {
					sendMessage: sendTabMessageMock,
				},
			},
		});
	});

	layer(silentLoggerLayer)((it) => {
		it.effect('sends only to extension pages when surface is popup', () =>
			Effect.gen(function* () {
				yield* runNotifyPopup(
					Done({
						tracks: [],
						skippedTrackCount: 0,
					}),
				).pipe(Effect.provide(makeTestLayer(ExtensionPopupSurface())));

				expect(sendRuntimeMessageMock).toHaveBeenCalledTimes(1);
				const payload = sendRuntimeMessageMock.mock.calls[0]?.[0];
				expect(isPopupStateUpdate(payload)).toBe(true);
				if (isPopupStateUpdate(payload)) {
					expect(payload.status).toBe('done');
				}
				expect(sendTabMessageMock).not.toHaveBeenCalled();
			}),
		);

		it.effect('sends only to the remembered overlay tab when surface is content', () =>
			Effect.gen(function* () {
				yield* runNotifyPopup(
					Done({
						tracks: [],
						skippedTrackCount: 0,
					}),
				).pipe(
					Effect.provide(
						makeTestLayer(ContentOverlaySurface({ tabId: 42 })),
					),
				);

				expect(sendRuntimeMessageMock).not.toHaveBeenCalled();
				expect(sendTabMessageMock).toHaveBeenCalledTimes(1);
				expect(sendTabMessageMock).toHaveBeenCalledWith(
					42,
					expect.objectContaining({ _tag: 'PopupStateUpdate', status: 'done' }),
				);
			}),
		);

		it.effect('ignores missing receivers on the chosen channel', () =>
			Effect.gen(function* () {
				sendRuntimeMessageMock.mockRejectedValue(
					new Error('Receiving end does not exist'),
				);

				const exit = yield* Effect.exit(
					runNotifyPopup(
						Done({
							tracks: [],
							skippedTrackCount: 0,
						}),
					).pipe(Effect.provide(makeTestLayer(ExtensionPopupSurface()))),
				);

				expect(exit._tag).toBe('Success');
			}),
		);
	});
});
