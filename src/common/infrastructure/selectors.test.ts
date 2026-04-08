import { describe, it, expect } from 'vitest';
import {
	isLoadingIndicatorPresent,
	isErrorIndicatorPresent,
	isUserLoggedIn,
} from './selectors';

describe('DOM indicator helpers', () => {
	describe('isLoadingIndicatorPresent', () => {
		it('returns true when loading indicator is present', () => {
			const dom = new DOMParser().parseFromString(
				'<div class="loading regular m-padded">Loading</div>',
				'text/html',
			);
			expect(isLoadingIndicatorPresent(dom)).toBe(true);
		});

		it('returns false when loading indicator is not present', () => {
			const dom = new DOMParser().parseFromString(
				'<div>Content</div>',
				'text/html',
			);
			expect(isLoadingIndicatorPresent(dom)).toBe(false);
		});
	});

	describe('isErrorIndicatorPresent', () => {
		it('returns true when error indicator is present', () => {
			const dom = new DOMParser().parseFromString(
				'<div class="inlineError">Error</div>',
				'text/html',
			);
			expect(isErrorIndicatorPresent(dom)).toBe(true);
		});

		it('returns false when error indicator is not present', () => {
			const dom = new DOMParser().parseFromString(
				'<div>Content</div>',
				'text/html',
			);
			expect(isErrorIndicatorPresent(dom)).toBe(false);
		});
	});

	describe('isUserLoggedIn', () => {
		it('returns true when user nav is present', () => {
			const dom = new DOMParser().parseFromString(
				'<div class="header__userNav">User Menu</div>',
				'text/html',
			);
			expect(isUserLoggedIn(dom)).toBe(true);
		});

		it('returns false when user nav is not present', () => {
			const dom = new DOMParser().parseFromString(
				'<div class="header">Header without nav</div>',
				'text/html',
			);
			expect(isUserLoggedIn(dom)).toBe(false);
		});

		it('returns false for empty document', () => {
			const dom = new DOMParser().parseFromString('', 'text/html');
			expect(isUserLoggedIn(dom)).toBe(false);
		});
	});
});
