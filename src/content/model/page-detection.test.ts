import { afterEach, describe, expect, layer, vi } from '@effect/vitest';
import { Cause, Effect, Exit, Fiber, Option } from 'effect';
import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
import {
	EMPTY_LIKES_LIST_MESSAGE,
	UNSUPPORTED_COLLECTION_PAGE_MESSAGE,
	UNSUPPORTED_LAYOUT_MESSAGE,
} from '@/content/model/collection-error-messages';
import { loadFixtureText } from '@/common/tests/fixture-loaders';
import {
	CollectionPageLoginRequired,
	UnsupportedCollectionPage,
	WAIT_FOR_LIST_TO_SETTLE_MS,
	detectSupportedCollectionPage,
} from '@/content/model/page-detection';
import { silentLoggerLayer } from '@/test/effect-log-test';

function detectionFailure(exit: Exit.Exit<unknown, unknown>): unknown {
	if (!Exit.isFailure(exit)) return undefined;
	return exit.cause.pipe(Cause.failureOption, Option.getOrUndefined);
}

describe('detectSupportedCollectionPage', () => {
	afterEach(() => {
		vi.useRealTimers();
		document.documentElement.innerHTML = '';
		window.history.replaceState(null, '', '/');
	});

	layer(silentLoggerLayer)((it) => {
		it.effect('returns the track list root for a supported likes page', () =>
			Effect.gen(function* () {
				document.body.innerHTML = [
					'<div class="header__userNav">User Menu</div>',
					'<div class="lazyLoadingList__list">',
					'<div class="badgeList__item">card</div>',
					'</div>',
				].join('');

				const exit = yield* Effect.exit(
					detectSupportedCollectionPage({
						pageDocument: document,
					}),
				);

				expect(Exit.isSuccess(exit)).toBe(true);
				if (!Exit.isSuccess(exit)) return;
				expect(exit.value.root.className).toBe('lazyLoadingList__list');
				expect(exit.value.layoutContext.layout).toBe('Badges');
			}),
		);

		it.effect(
			'supports a non-likes pathname when collection DOM is present',
			() =>
				Effect.gen(function* () {
					window.history.pushState(null, '', '/artist/track');
					document.body.innerHTML = [
						'<div class="header__userNav">User Menu</div>',
						'<div class="lazyLoadingList__list">',
						'<div class="badgeList__item">card</div>',
						'</div>',
					].join('');

					const exit = yield* Effect.exit(
						detectSupportedCollectionPage({
							pageDocument: document,
						}),
					);

					expect(location.pathname).toBe('/artist/track');
					expect(Exit.isSuccess(exit)).toBe(true);
					if (!Exit.isSuccess(exit)) return;
					expect(exit.value.layoutContext.layout).toBe('Badges');
				}),
		);

		it.effect('returns List layout context for list-view DOM', () =>
			Effect.gen(function* () {
				document.body.innerHTML = [
					'<div class="header__userNav">User Menu</div>',
					loadFixtureText('list-view.html'),
				].join('');

				const exit = yield* Effect.exit(
					detectSupportedCollectionPage({
						pageDocument: document,
					}),
				);

				expect(Exit.isSuccess(exit)).toBe(true);
				if (!Exit.isSuccess(exit)) return;
				expect(exit.value.layoutContext.layout).toBe('List');
			}),
		);

		it.effect(
			'fails with unsupported-layout when both badge and list cards are present',
			() =>
				Effect.gen(function* () {
					document.body.innerHTML = [
						'<div class="header__userNav">User Menu</div>',
						'<div class="lazyLoadingList__list">',
						'<div class="badgeList__item">badge</div>',
						'<li class="soundList__item">list</li>',
						'</div>',
					].join('');

					const exit = yield* Effect.exit(
						detectSupportedCollectionPage({
							pageDocument: document,
						}),
					);
					const failure = detectionFailure(exit);

					expect(failure).toBeInstanceOf(UnsupportedCollectionPage);
					expect(failure).toMatchObject({
						message: UNSUPPORTED_LAYOUT_MESSAGE,
						reason: 'Layout detection returned Unknown',
					});
				}),
		);

		it.effect(
			'fails with login-required when the page has a list but no user nav',
			() =>
				Effect.gen(function* () {
					document.body.innerHTML = [
						'<div class="lazyLoadingList__list">',
						'<div class="badgeList__item">card</div>',
						'</div>',
					].join('');

					const exit = yield* Effect.exit(
						detectSupportedCollectionPage({
							pageDocument: document,
						}),
					);
					const failure = detectionFailure(exit);

					expect(failure).toBeInstanceOf(CollectionPageLoginRequired);
					expect(failure).toMatchObject({
						message: LOGIN_REQUIRED_MESSAGE,
						reason: 'User nav selector not found in page DOM',
					});
				}),
		);

		it.effect(
			'fails with empty-list message when the list container has no cards',
			() =>
				Effect.gen(function* () {
					document.body.innerHTML = [
						'<div class="header__userNav">User Menu</div>',
						'<div class="lazyLoadingList__list"></div>',
					].join('');

					const exit = yield* Effect.exit(
						detectSupportedCollectionPage({
							pageDocument: document,
						}),
					);
					const failure = detectionFailure(exit);

					expect(failure).toBeInstanceOf(UnsupportedCollectionPage);
					expect(failure).toMatchObject({
						message: EMPTY_LIKES_LIST_MESSAGE,
						reason: 'Track list container found but contains no track cards',
					});
				}),
		);

		it.effect(
			'fails with empty-list message when spinner clears and no cards appear',
			() =>
				Effect.gen(function* () {
					document.body.innerHTML = [
						'<div class="header__userNav">User Menu</div>',
						'<div class="lazyLoadingList__list"></div>',
						'<div class="loading regular m-padded">Loading</div>',
					].join('');

					const exitFiber = yield* Effect.fork(
						Effect.exit(
							detectSupportedCollectionPage({
								pageDocument: document,
							}),
						),
					);

					document.querySelector('.loading.regular.m-padded')?.remove();
					const exit = yield* Fiber.join(exitFiber);
					const failure = detectionFailure(exit);

					expect(failure).toBeInstanceOf(UnsupportedCollectionPage);
					expect(failure).toMatchObject({
						message: EMPTY_LIKES_LIST_MESSAGE,
						reason: 'Track list container found but contains no track cards',
					});
				}),
		);

		it.effect('succeeds when cards appear after spinner clears', () =>
			Effect.gen(function* () {
				document.body.innerHTML = [
					'<div class="header__userNav">User Menu</div>',
					'<div class="lazyLoadingList__list"></div>',
					'<div class="loading regular m-padded">Loading</div>',
				].join('');

				const exitFiber = yield* Effect.fork(
					Effect.exit(
						detectSupportedCollectionPage({
							pageDocument: document,
						}),
					),
				);

				document.querySelector('.loading.regular.m-padded')?.remove();
				const list = document.querySelector('.lazyLoadingList__list');
				list?.insertAdjacentHTML(
					'beforeend',
					'<div class="badgeList__item">card</div>',
				);

				const exit = yield* Fiber.join(exitFiber);
				expect(Exit.isSuccess(exit)).toBe(true);
			}),
		);

		it.effect(
			'fails when loading indicator does not settle before timeout',
			() =>
				Effect.gen(function* () {
					vi.useFakeTimers();
					document.body.innerHTML = [
						'<div class="header__userNav">User Menu</div>',
						'<div class="lazyLoadingList__list"></div>',
						'<div class="loading regular m-padded">Loading</div>',
					].join('');

					const exitFiber = yield* Effect.fork(
						Effect.exit(
							detectSupportedCollectionPage({
								pageDocument: document,
								settleTimeoutMs: 1,
							}),
						),
					);

					yield* Effect.promise(() =>
						vi.advanceTimersByTimeAsync(WAIT_FOR_LIST_TO_SETTLE_MS),
					);
					const exit = yield* Fiber.join(exitFiber);
					const failure = detectionFailure(exit);

					expect(failure).toBeInstanceOf(UnsupportedCollectionPage);
					expect(failure).toMatchObject({
						message: UNSUPPORTED_COLLECTION_PAGE_MESSAGE,
						reason:
							'Track list loading indicator did not settle before timeout',
					});
				}),
		);

		it.effect(
			'fails with a missing-list message when the page lacks supported collection DOM',
			() =>
				Effect.gen(function* () {
					vi.useFakeTimers();
					document.body.innerHTML =
						'<div class="header__userNav">User Menu</div>';

					const exitFiber = yield* Effect.fork(
						Effect.exit(
							detectSupportedCollectionPage({
								pageDocument: document,
								timeoutMs: 1,
							}),
						),
					);

					yield* Effect.promise(() => vi.advanceTimersByTimeAsync(1));
					const exit = yield* Fiber.join(exitFiber);
					const failure = detectionFailure(exit);

					expect(failure).toBeInstanceOf(UnsupportedCollectionPage);
					expect(failure).toMatchObject({
						message: UNSUPPORTED_COLLECTION_PAGE_MESSAGE,
						reason:
							'Track list container selector did not match any elements before timeout',
					});
				}),
		);
	});
});
