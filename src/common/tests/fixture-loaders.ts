import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Test-only helpers for reading static HTML fixtures from `tests/fixtures/`.
 */
export function loadFixtureText(fixtureFileName: `${string}.html`): string {
	const fixturePath = path.join(
		path.dirname(fileURLToPath(import.meta.url)),
		`../../../tests/fixtures/${fixtureFileName}`,
	);

	return readFileSync(fixturePath, 'utf-8');
}
