import { describe, expect, it } from 'vitest';
import { ACTION_DEFAULT_POPUP_PATH } from '@/background/action-popup-path';
import { actionPopupPathForUrl } from '@/background/action-popup-for-url';

describe('actionPopupPathForUrl', () => {
	it('returns empty popup path for SoundCloud URLs', () => {
		expect(actionPopupPathForUrl('https://soundcloud.com/you/likes')).toBe('');
		expect(actionPopupPathForUrl('http://soundcloud.com/discover')).toBe('');
	});

	it('returns default popup path for non-SoundCloud URLs', () => {
		expect(actionPopupPathForUrl('https://example.com')).toBe(
			ACTION_DEFAULT_POPUP_PATH,
		);
		expect(actionPopupPathForUrl('https://www.soundcloud.com/likes')).toBe(
			ACTION_DEFAULT_POPUP_PATH,
		);
	});

	it('returns default popup path when url is undefined', () => {
		expect(actionPopupPathForUrl(undefined)).toBe(ACTION_DEFAULT_POPUP_PATH);
	});
});
