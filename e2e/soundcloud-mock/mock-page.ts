import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { BADGES_VIEW_FIXTURE_FILE, USER_NAV_CLASS } from './constants';

function badgesViewFixturePath(): string {
	return path.resolve(
		path.dirname(fileURLToPath(import.meta.url)),
		'../../tests/fixtures',
		BADGES_VIEW_FIXTURE_FILE,
	);
}

export function buildSoundCloudMockHtml(): string {
	const badgesViewHtml = readFileSync(badgesViewFixturePath(), 'utf8');

	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<title>Likes</title>
	</head>
	<body>
		<div class="${USER_NAV_CLASS}"></div>
		${badgesViewHtml}
	</body>
</html>
`;
}
