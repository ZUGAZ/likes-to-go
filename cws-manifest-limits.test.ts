import { describe, expect, it } from 'vitest';
import packageJson from './package.json';

/** Chrome Web Store limit for `manifest.description` (WXT uses `package.json` `description`). */
const CWS_MANIFEST_DESCRIPTION_MAX_LENGTH = 132;

describe('CWS manifest limits', () => {
	it('keeps package.json description within the Chrome Web Store manifest limit', () => {
		expect(packageJson.description.length).toBeLessThanOrEqual(
			CWS_MANIFEST_DESCRIPTION_MAX_LENGTH,
		);
	});
});
