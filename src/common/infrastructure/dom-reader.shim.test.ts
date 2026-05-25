import { describe, expect, it } from '@effect/vitest';
import { getTracksFromCards } from '@/common/infrastructure/dom-reader';
import { badgesSelectorSet } from '@/layout/infrastructure/layouts/badges';
import { readTracksFromCards } from '@/layout/infrastructure/read-tracks-from-cards';

describe('dom-reader shim', () => {
	it('getTracksFromCards matches readTracksFromCards with badgesSelectorSet', () => {
		const baseUrl = 'https://soundcloud.com';
		const root = document.createElement('div');
		root.innerHTML = `
			<li class="badgeList__item">
				<div class="audibleTile">
					<a class="audibleTile__artworkLink" href="/a/b"></a>
					<a class="playableTile__mainHeading">One</a>
					<a class="playableTile__usernameHeading">Artist</a>
				</div>
			</li>
		`;
		const cards = Array.from(root.querySelectorAll('.badgeList__item'));

		expect(getTracksFromCards(cards, baseUrl)).toEqual(
			readTracksFromCards(cards, baseUrl, badgesSelectorSet),
		);
	});
});
