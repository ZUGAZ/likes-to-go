import { beforeEach, describe, expect, layer } from '@effect/vitest';
import {
	Cause,
	Effect,
	Exit,
	Fiber,
	Layer,
	Option,
	TestClock,
	TestContext,
} from 'effect';
import { vi } from 'vitest';

import { ContentCommandsTag } from '@/background/content-commands';
import { ContentCommandsLegacy } from '@/background/infrastructure/content-commands-legacy';
import { sendToTabEffect } from '@/common/infrastructure/chrome-messaging';
import { SendToTabMessagingFailed } from '@/common/infrastructure/send-to-tab';
import { isSendToTabFailed } from '@/common/model/collection/events/send-to-tab-failed';
import {
	ShowMascotRequest,
	StartCollectionRequest,
	ToggleMascotRequest,
} from '@/common/model/request-message';
import { makeCapturingLogger, silentLoggerLayer } from '@/test/effect-log-test';

vi.mock('@/common/infrastructure/chrome-messaging', () => ({
	sendToTabEffect: vi.fn(() => Effect.void),
}));

const missingReceiver = new SendToTabMessagingFailed({
	reason: 'Could not establish connection. Receiving end does not exist.',
});

const otherFailure = new SendToTabMessagingFailed({
	reason: 'tab is gone',
});

const failedSend = (exit: Exit.Exit<unknown, unknown>): boolean => {
	if (!Exit.isFailure(exit)) {
		return false;
	}
	const failure = Cause.failureOption(exit.cause);
	return Option.isSome(failure) && isSendToTabFailed(failure.value);
};

describe('ContentCommandsLegacy', () => {
	const sendToTabEffectMock = vi.mocked(sendToTabEffect);

	beforeEach(() => {
		vi.resetAllMocks();
		sendToTabEffectMock.mockReturnValue(Effect.void);
	});

	layer(
		Layer.mergeAll(
			silentLoggerLayer,
			ContentCommandsLegacy,
			TestContext.TestContext,
		),
	)((it) => {
		it.effect('sends ToggleMascot to the tab', () =>
			Effect.gen(function* () {
				yield* (yield* ContentCommandsTag).toggleMascot(7);
				expect(sendToTabEffectMock).toHaveBeenCalledWith(
					7,
					ToggleMascotRequest(),
				);
			}),
		);

		it.effect('sends ShowMascot to the tab', () =>
			Effect.gen(function* () {
				yield* (yield* ContentCommandsTag).showMascot(7);
				expect(sendToTabEffectMock).toHaveBeenCalledWith(
					7,
					ShowMascotRequest(),
				);
			}),
		);

		it.effect('retries a missing start receiver, then fails', () =>
			Effect.gen(function* () {
				sendToTabEffectMock.mockReturnValue(Effect.fail(missingReceiver));
				const fiber = yield* (yield* ContentCommandsTag)
					.startPageCollection(42)
					.pipe(Effect.fork);
				yield* TestClock.adjust('2999 millis');
				expect(Option.isNone(yield* Fiber.poll(fiber))).toBe(true);
				yield* TestClock.adjust('1 millis');
				const exit = yield* Fiber.join(fiber).pipe(Effect.exit);
				expect(failedSend(exit)).toBe(true);
				expect(sendToTabEffectMock).toHaveBeenCalledTimes(5);
				expect(sendToTabEffectMock).toHaveBeenCalledWith(
					42,
					StartCollectionRequest(),
				);
			}),
		);

		it.effect('does not retry start when the receiver error is different', () =>
			Effect.gen(function* () {
				sendToTabEffectMock.mockReturnValue(Effect.fail(otherFailure));
				const exit = yield* (yield* ContentCommandsTag)
					.startPageCollection(42)
					.pipe(Effect.exit);
				expect(sendToTabEffectMock).toHaveBeenCalledTimes(1);
				expect(failedSend(exit)).toBe(true);
			}),
		);

		it.effect(
			'retries missing receiver failures then logs warning and succeeds',
			() =>
				Effect.gen(function* () {
					const capturingLogger = makeCapturingLogger();
					sendToTabEffectMock.mockReturnValue(Effect.fail(missingReceiver));
					const fiber = yield* (yield* ContentCommandsTag)
						.toggleMascot(7)
						.pipe(Effect.provide(capturingLogger.layer), Effect.fork);
					yield* TestClock.adjust('1400 millis');
					yield* Fiber.join(fiber);
					expect(sendToTabEffectMock).toHaveBeenCalledTimes(4);
					expect(capturingLogger.messages()).toEqual(
						expect.arrayContaining([
							expect.arrayContaining(['ToggleMascot retry']),
							expect.arrayContaining(['ToggleMascot send failed']),
						]),
					);
				}),
		);
	});
});
