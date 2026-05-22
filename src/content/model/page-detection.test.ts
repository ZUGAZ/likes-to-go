import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
import {
	EMPTY_LIKES_LIST_MESSAGE,
	UNSUPPORTED_COLLECTION_PAGE_MESSAGE,
} from '@/content/model/collection-error-messages';
import {
	CollectionPageLoginRequired,
	UnsupportedCollectionPage,
	WAIT_FOR_LIST_TO_SETTLE_MS,
	detectSupportedCollectionPage,
} from '@/content/model/page-detection';
import { runPromiseExitWithSilentLogger } from '@/test/effect-log-test';
import { Cause, Exit, Option } from 'effect';
import { afterEach, describe, expect, it, vi } from 'vitest';

function detectionFailure(
	exit: Awaited<ReturnType<typeof runPromiseExitWithSilentLogger>>,
): unknown {
	if (!Exit.isFailure(exit)) return undefined;
	return exit.cause.pipe(Cause.failureOption, Option.getOrUndefined);
}

describe('detectSupportedCollectionPage', () => {
	afterEach(() => {
		vi.useRealTimers();
		document.documentElement.innerHTML = '';
		window.history.replaceState(null, '', '/');
	});

	it('returns the track list root for a supported likes page', async () => {
		document.body.innerHTML = [
			'<div class="header__userNav">User Menu</div>',
			'<div class="lazyLoadingList__list">',
			'<div class="badgeList__item">card</div>',
			'</div>',
		].join('');

		const exit = await runPromiseExitWithSilentLogger(
			detectSupportedCollectionPage({
				pageDocument: document,
			}),
		);

		expect(Exit.isSuccess(exit)).toBe(true);
		if (!Exit.isSuccess(exit)) return;
		expect(exit.value.className).toBe('lazyLoadingList__list');
	});

	it('supports a non-likes pathname when collection DOM is present', async () => {
		window.history.pushState(null, '', '/artist/track');
		document.body.innerHTML = [
			'<div class="header__userNav">User Menu</div>',
			'<div class="lazyLoadingList__list">',
			'<div class="badgeList__item">card</div>',
			'</div>',
		].join('');

		const exit = await runPromiseExitWithSilentLogger(
			detectSupportedCollectionPage({
				pageDocument: document,
			}),
		);

		expect(location.pathname).toBe('/artist/track');
		expect(Exit.isSuccess(exit)).toBe(true);
	});

	it('fails with login-required when the page has a list but no user nav', async () => {
		document.body.innerHTML = [
			'<div class="lazyLoadingList__list">',
			'<div class="badgeList__item">card</div>',
			'</div>',
		].join('');

		const exit = await runPromiseExitWithSilentLogger(
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
	});

	it('fails with a clear empty-list message when the likes list has no cards', async () => {
		document.body.innerHTML = [
			'<div class="header__userNav">User Menu</div>',
			'<div class="lazyLoadingList__list"></div>',
		].join('');

		const exit = await runPromiseExitWithSilentLogger(
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
	});

	it('fails with empty-list message when spinner clears and no cards appear', async () => {
		document.body.innerHTML = [
			'<div class="header__userNav">User Menu</div>',
			'<div class="lazyLoadingList__list"></div>',
			'<div class="loading regular m-padded">Loading</div>',
		].join('');

		const exitPromise = runPromiseExitWithSilentLogger(
			detectSupportedCollectionPage({
				pageDocument: document,
			}),
		);

		document.querySelector('.loading.regular.m-padded')?.remove();
		const failure = detectionFailure(await exitPromise);

		expect(failure).toBeInstanceOf(UnsupportedCollectionPage);
		expect(failure).toMatchObject({
			message: EMPTY_LIKES_LIST_MESSAGE,
			reason: 'Track list container found but contains no track cards',
		});
	});

	it('succeeds when cards appear after spinner clears', async () => {
		document.body.innerHTML = [
			'<div class="header__userNav">User Menu</div>',
			'<div class="lazyLoadingList__list"></div>',
			'<div class="loading regular m-padded">Loading</div>',
		].join('');

		const exitPromise = runPromiseExitWithSilentLogger(
			detectSupportedCollectionPage({
				pageDocument: document,
			}),
		);

		document.querySelector('.loading.regular.m-padded')?.remove();
		const list = document.querySelector('.lazyLoadingList__list');
		list?.insertAdjacentHTML(
			'beforeend',
			'<div class="badgeList__item">card</div>',
		);

		const exit = await exitPromise;
		expect(Exit.isSuccess(exit)).toBe(true);
	});

	it('fails when loading indicator does not settle before timeout', async () => {
		vi.useFakeTimers();
		document.body.innerHTML = [
			'<div class="header__userNav">User Menu</div>',
			'<div class="lazyLoadingList__list"></div>',
			'<div class="loading regular m-padded">Loading</div>',
		].join('');

		const exitPromise = runPromiseExitWithSilentLogger(
			detectSupportedCollectionPage({
				pageDocument: document,
				settleTimeoutMs: 1,
			}),
		);

		await vi.advanceTimersByTimeAsync(WAIT_FOR_LIST_TO_SETTLE_MS);
		const failure = detectionFailure(await exitPromise);

		expect(failure).toBeInstanceOf(UnsupportedCollectionPage);
		expect(failure).toMatchObject({
			message: UNSUPPORTED_COLLECTION_PAGE_MESSAGE,
			reason: 'Track list loading indicator did not settle before timeout',
		});
	});

	it('fails with a missing-list message when the page lacks supported collection DOM', async () => {
		vi.useFakeTimers();
		document.body.innerHTML = '<div class="header__userNav">User Menu</div>';

		const exitPromise = runPromiseExitWithSilentLogger(
			detectSupportedCollectionPage({
				pageDocument: document,
				timeoutMs: 1,
			}),
		);

		await vi.advanceTimersByTimeAsync(1);
		const failure = detectionFailure(await exitPromise);

		expect(failure).toBeInstanceOf(UnsupportedCollectionPage);
		expect(failure).toMatchObject({
			message: UNSUPPORTED_COLLECTION_PAGE_MESSAGE,
			reason:
				'Track list container selector did not match any elements before timeout',
		});
	});
});
