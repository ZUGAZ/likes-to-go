import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ACTION_DEFAULT_POPUP_PATH } from '@/background/action-popup-path';
import { mascotWebAccessibleResources } from './wxt.config';
import packageJson from './package.json';

/** Chrome Web Store limit for `manifest.description` (WXT uses `package.json` `description`). */
const CWS_MANIFEST_DESCRIPTION_MAX_LENGTH = 132;

/** WXT entry name under `src/entrypoints/<name>/` → built `action.default_popup` is `<name>.html`. */
const WXT_POPUP_ENTRYPOINT_NAME = 'popup';

describe('CWS manifest limits', () => {
	it('keeps package.json description within the Chrome Web Store manifest limit', () => {
		expect(packageJson.description.length).toBeLessThanOrEqual(
			CWS_MANIFEST_DESCRIPTION_MAX_LENGTH,
		);
	});

	it('exposes mascot WebPs to SoundCloud only via web_accessible_resources', () => {
		expect(mascotWebAccessibleResources).toEqual([
			{
				resources: ['mascot/*.webp'],
				matches: ['https://*.soundcloud.com/*'],
			},
		]);
	});

	it('keeps ACTION_DEFAULT_POPUP_PATH aligned with the WXT popup entrypoint', () => {
		const entrypointDir = resolve(
			`src/entrypoints/${WXT_POPUP_ENTRYPOINT_NAME}`,
		);
		expect(existsSync(entrypointDir)).toBe(true);
		expect(ACTION_DEFAULT_POPUP_PATH).toBe(`${WXT_POPUP_ENTRYPOINT_NAME}.html`);
	});
});
