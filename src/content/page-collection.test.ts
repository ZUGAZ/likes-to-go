import { describe, expect, it } from '@effect/vitest';
import { Context, Deferred, Effect, Exit, Fiber, Layer, Option } from 'effect';
import { afterEach, vi } from 'vitest';

import { SendToBackgroundFailed } from '@/common/infrastructure/send-to-background';
import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
import { BackgroundSenderTag } from '@/content/infrastructure/background-sender';
import type { BackgroundSender } from '@/content/infrastructure/background-sender';
import { MascotControlsTag } from '@/content/mascot-controls';
import { EMPTY_LIKES_LIST_MESSAGE } from '@/content/model/collection-error-messages';
import {
	PageCollectionLive,
	PageCollectionTag,
} from '@/content/page-collection';
import { makeCapturingLogger, silentLoggerLayer } from '@/test/effect-log-test';

const pipelineControl = vi.hoisted(() => ({
	takeWait: (): Effect.Effect<void> => Effect.die('pipeline wait was not set'),
}));

vi.mock(
	'@/content/infrastructure/collection-services',
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import('@/content/infrastructure/collection-services')
			>();
		const { Effect: EffectNs, Layer: LayerNs } = await import('effect');
		const emptyBatch = {
			tracks: [],
			parsedCount: 0,
			skippedCount: 0,
			totalValidCount: 0,
			noNewCards: true,
		};
		const emptyState = {
			previousValidCount: 0,
			totalParsedCount: 0,
			totalSkippedCount: 0,
		};
		return {
			...actual,
			makeCollectionLive: () =>
				LayerNs.mergeAll(
					LayerNs.succeed(actual.DomScannerTag, {
						scanBatch: () =>
							EffectNs.flatMap(
								EffectNs.sync(() => pipelineControl.takeWait()),
								(wait) =>
									wait.pipe(
										EffectNs.as({ batch: emptyBatch, nextState: emptyState }),
									),
							),
						isLoadingIndicatorPresent: () => EffectNs.succeed(false),
						isErrorIndicatorPresent: () => EffectNs.succeed(false),
						clickRetry: () => EffectNs.void,
					}),
					LayerNs.succeed(actual.ScrollerTag, {
						scrollToBottom: () => EffectNs.void,
					}),
					LayerNs.succeed(actual.DocumentVisibilityTag, {
						isHidden: () => EffectNs.succeed(false),
					}),
				),
		};
	},
);

const controls = Layer.succeed(MascotControlsTag, {
	isVisible: () => false,
	summon: () => undefined,
	dismiss: () => undefined,
	toggle: () => undefined,
});

const supportedLikesDom = (): void => {
	document.body.innerHTML = [
		'<div class="header__userNav">User Menu</div>',
		'<div class="lazyLoadingList__list">',
		'<div class="badgeList__item">card</div>',
		'</div>',
	].join('');
};

const loginRequiredDom = (): void => {
	document.body.innerHTML = [
		'<div class="lazyLoadingList__list">',
		'<div class="badgeList__item">card</div>',
		'</div>',
	].join('');
};

const emptyListDom = (): void => {
	document.body.innerHTML = [
		'<div class="header__userNav">User Menu</div>',
		'<div class="lazyLoadingList__list"></div>',
	].join('');
};

const senderLayer = (
	sender: BackgroundSender,
): Layer.Layer<BackgroundSenderTag> =>
	Layer.succeed(BackgroundSenderTag, sender);

const idleSender = (): BackgroundSender => ({
	sendBatch: () => Effect.void,
	sendComplete: () => Effect.void,
	sendVisibilityPaused: () => Effect.void,
	sendVisibilityResumed: () => Effect.void,
	sendError: () => Effect.void,
	sendLoginRequired: () => Effect.void,
});

const openPageCollection = (
	sender: BackgroundSender,
	logger = silentLoggerLayer,
) =>
	Layer.build(
		PageCollectionLive.pipe(
			Layer.provide(Layer.mergeAll(senderLayer(sender), controls)),
			Layer.provideMerge(logger),
		),
	).pipe(Effect.map((context) => Context.get(context, PageCollectionTag)));

const finishedLogs = (messages: readonly unknown[]): readonly unknown[] =>
	messages.filter((message) =>
		JSON.stringify(message).includes('content collection finished'),
	);

describe('PageCollection', () => {
	afterEach(() => {
		document.documentElement.innerHTML = '';
		pipelineControl.takeWait = () => Effect.die('pipeline wait was not set');
	});

	it.scoped('returns from start while the pipeline is blocked', () =>
		Effect.gen(function* () {
			supportedLikesDom();
			const started = yield* Deferred.make<undefined>();
			const block = yield* Deferred.make<undefined>();
			let interruptions = 0;
			pipelineControl.takeWait = () =>
				Deferred.succeed(started, undefined).pipe(
					Effect.zipRight(Deferred.await(block)),
					Effect.onInterrupt(() =>
						Effect.sync(() => {
							interruptions += 1;
						}),
					),
				);
			const pageCollection = yield* openPageCollection(idleSender());
			const startFiber = yield* pageCollection.start.pipe(Effect.fork);
			yield* Deferred.await(started);
			const polled = yield* Fiber.poll(startFiber);
			expect(Option.isSome(polled)).toBe(true);
			if (Option.isSome(polled)) {
				expect(Exit.isSuccess(polled.value)).toBe(true);
			}
			expect(interruptions).toBe(0);

			const second = yield* Deferred.make<undefined>();
			pipelineControl.takeWait = () => Deferred.await(second);
			yield* pageCollection.start;
			expect(interruptions).toBe(1);
		}),
	);

	it.scoped('cancel interrupts the fiber and is a no-op without one', () =>
		Effect.gen(function* () {
			const pageCollection = yield* openPageCollection(idleSender());
			yield* pageCollection.cancel;

			supportedLikesDom();
			const started = yield* Deferred.make<undefined>();
			const block = yield* Deferred.make<undefined>();
			let interruptions = 0;
			pipelineControl.takeWait = () =>
				Deferred.succeed(started, undefined).pipe(
					Effect.zipRight(Deferred.await(block)),
					Effect.onInterrupt(() =>
						Effect.sync(() => {
							interruptions += 1;
						}),
					),
				);
			yield* pageCollection.start;
			yield* Deferred.await(started);
			yield* pageCollection.cancel;
			expect(interruptions).toBe(1);
		}),
	);

	it.scoped(
		'reports login-required and unsupported pages as OutcomeError',
		() =>
			Effect.gen(function* () {
				const logger = makeCapturingLogger();
				const calls: Array<string> = [];
				const sender: BackgroundSender = {
					...idleSender(),
					sendLoginRequired: (message, reason) =>
						Effect.sync(() => {
							calls.push(`login:${message}:${reason}`);
						}),
					sendError: (message, reason) =>
						Effect.sync(() => {
							calls.push(`error:${message}:${reason}`);
						}),
				};
				const pageCollection = yield* openPageCollection(sender, logger.layer);

				loginRequiredDom();
				yield* pageCollection.start;
				for (
					let step = 0;
					step < 20 && finishedLogs(logger.messages()).length === 0;
					step += 1
				) {
					yield* Effect.yieldNow();
				}
				expect(calls[0]).toContain(LOGIN_REQUIRED_MESSAGE);
				expect(finishedLogs(logger.messages())).toHaveLength(1);

				calls.length = 0;
				emptyListDom();
				yield* pageCollection.start;
				for (
					let step = 0;
					step < 20 && finishedLogs(logger.messages()).length < 2;
					step += 1
				) {
					yield* Effect.yieldNow();
				}
				expect(calls[0]).toContain(EMPTY_LIKES_LIST_MESSAGE);
				expect(finishedLogs(logger.messages())).toHaveLength(2);
				expect(
					logger
						.messages()
						.some((message) =>
							JSON.stringify(message).includes('content collection fiber died'),
						),
				).toBe(false);
			}),
	);

	it.scoped('finishes OutcomeError when the detection report fails', () =>
		Effect.gen(function* () {
			const logger = makeCapturingLogger();
			loginRequiredDom();
			const sender: BackgroundSender = {
				...idleSender(),
				sendLoginRequired: () =>
					Effect.fail(new SendToBackgroundFailed({ reason: 'down' })),
			};
			const pageCollection = yield* openPageCollection(sender, logger.layer);
			const exit = yield* pageCollection.start.pipe(Effect.exit);
			expect(Exit.isSuccess(exit)).toBe(true);
			for (
				let step = 0;
				step < 10 && finishedLogs(logger.messages()).length === 0;
				step += 1
			) {
				yield* Effect.yieldNow();
			}
			const finished = finishedLogs(logger.messages());
			expect(finished).toHaveLength(1);
			expect(JSON.stringify(finished[0])).toContain('Error');
			expect(
				logger
					.messages()
					.some((message) =>
						JSON.stringify(message).includes(
							'content StartCollection program failed',
						),
					),
			).toBe(false);
		}),
	);
});
