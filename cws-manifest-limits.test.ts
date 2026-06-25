import { describe, expect, it } from 'vitest';
import { mascotWebAccessibleResources } from './wxt.config';
import packageJson from './package.json';

/** Chrome Web Store limit for `manifest.description` (WXT uses `package.json` `description`). */
const CWS_MANIFEST_DESCRIPTION_MAX_LENGTH = 132;

describe('CWS manifest limits', () => {
	it('keeps package.json description within the Chrome Web Store manifest limit', () => {
		expect(packageJson.description.length).toBeLessThanOrEqual(
			CWS_MANIFEST_DESCRIPTION_MAX_LENGTH,
		);
	});

	it('exposes mascot PNGs to SoundCloud only via web_accessible_resources', () => {
		expect(mascotWebAccessibleResources).toEqual([
			{
				resources: ['mascot/*.png'],
				matches: ['https://*.soundcloud.com/*'],
			},
		]);
	});
});
