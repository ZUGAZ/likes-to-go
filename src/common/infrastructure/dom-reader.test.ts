import {
	TRACK_ARTIST,
	TRACK_ARTWORK,
	TRACK_CARD,
	TRACK_LINK,
	TRACK_LIST_CONTAINER,
	TRACK_TITLE,
} from '@/common/infrastructure/selectors';
import { describe, expect, it } from 'vitest';
import {
	getTracksFromCards,
	getTracksFromRoot,
} from '@/common/infrastructure/dom-reader';
import { loadFixtureText } from '@/common/tests/fixture-loaders';

function createFixture(innerHTML: string): Element {
	const root = document.createElement('div');
	root.className = 'lazyLoadingList__list';
	root.innerHTML = innerHTML;
	return root;
}

describe('getTracksFromRoot', () => {
	const baseUrl = 'https://soundcloud.com';

	it('returns empty array when no cards', () => {
		const root = createFixture('<p>no tracks</p>');
		expect(getTracksFromRoot(root, baseUrl)).toEqual([]);
	});

	it('parses cards with badgeList__item and playableTile selectors', () => {
		const root = createFixture(`
			<ul class="lazyLoadingList__list">
				<li class="badgeList__item">
					<div class="audibleTile">
						<a class="audibleTile__artworkLink" href="/artist-one/track-a"></a>
						<a class="playableTile__mainHeading">Track A</a>
						<a class="playableTile__usernameHeading">Artist One</a>
					</div>
				</li>
				<li class="badgeList__item">
					<div class="audibleTile">
						<a class="audibleTile__artworkLink" href="/artist-two/track-b"></a>
						<a class="playableTile__mainHeading">Track B</a>
						<a class="playableTile__usernameHeading">Artist Two</a>
					</div>
				</li>
			</ul>
		`);
		const tracks = getTracksFromRoot(root, baseUrl);
		expect(tracks).toHaveLength(2);
		expect(tracks[0]).toEqual({
			title: 'Track A',
			artist: 'Artist One',
			url: 'https://soundcloud.com/artist-one/track-a',
		});
		expect(tracks[1]).toEqual({
			title: 'Track B',
			artist: 'Artist Two',
			url: 'https://soundcloud.com/artist-two/track-b',
		});
	});

	it('skips cards without title or url', () => {
		const root = createFixture(`
			<ul class="lazyLoadingList__list">
				<li class="badgeList__item">
					<div class="audibleTile">
						<a class="audibleTile__artworkLink" href=""></a>
						<a class="playableTile__mainHeading">No link</a>
						<a class="playableTile__usernameHeading">Who</a>
					</div>
				</li>
				<li class="badgeList__item">
					<div class="audibleTile">
						<a class="audibleTile__artworkLink" href="/artist/track"></a>
						<a class="playableTile__mainHeading"></a>
						<a class="playableTile__usernameHeading">Artist</a>
					</div>
				</li>
			</ul>
		`);
		const tracks = getTracksFromRoot(root, baseUrl);
		expect(tracks).toHaveLength(0);
	});

	it('resolves relative hrefs with baseUrl', () => {
		const root = createFixture(`
			<li class="badgeList__item">
				<div class="audibleTile">
					<a class="audibleTile__artworkLink" href="/user/song"></a>
					<a class="playableTile__mainHeading">Song</a>
					<a class="playableTile__usernameHeading">User</a>
				</div>
			</li>
		`);
		const tracks = getTracksFromRoot(root, baseUrl);
		expect(tracks[0]?.url).toBe('https://soundcloud.com/user/song');
	});

	it('extracts artwork_url from .playableTile__artwork .sc-artwork.image__full style', () => {
		const root = createFixture(`
			<li class="badgeList__item">
				<div class="playableTile">
					<div class="playableTile__artwork">
						<a class="audibleTile__artworkLink" href="/artist/track"></a>
						<div class="playableTile__image">
							<span class="sc-artwork image__full" style="background-image: url(&quot;https://i1.sndcdn.com/artworks-abc-t500x500.png&quot;);"></span>
						</div>
					</div>
					<a class="playableTile__mainHeading">Track</a>
					<a class="playableTile__usernameHeading">Artist</a>
				</div>
			</li>
		`);
		const tracks = getTracksFromRoot(root, baseUrl);
		expect(tracks).toHaveLength(1);
		expect(tracks[0]?.artwork_url).toBe(
			'https://i1.sndcdn.com/artworks-abc-t500x500.png',
		);
	});

	it('omits optional fields when missing; does not fail card', () => {
		const root = createFixture(`
			<li class="badgeList__item">
				<div class="audibleTile">
					<a class="audibleTile__artworkLink" href="/x/y"></a>
					<a class="playableTile__mainHeading">Minimal</a>
					<a class="playableTile__usernameHeading">Who</a>
				</div>
			</li>
		`);
		const tracks = getTracksFromRoot(root, baseUrl);
		expect(tracks).toHaveLength(1);
		expect(tracks[0]).toEqual({
			title: 'Minimal',
			artist: 'Who',
			url: 'https://soundcloud.com/x/y',
		});
		expect('artwork_url' in (tracks[0] ?? {})).toBe(false);
	});

	it('getTracksFromCards matches getTracksFromRoot when given all cards from root', () => {
		const root = createFixture(`
			<li class="badgeList__item">
				<div class="audibleTile">
					<a class="audibleTile__artworkLink" href="/a/b"></a>
					<a class="playableTile__mainHeading">One</a>
					<a class="playableTile__usernameHeading">Artist</a>
				</div>
			</li>
			<li class="badgeList__item">
				<div class="audibleTile">
					<a class="audibleTile__artworkLink" href="/c/d"></a>
					<a class="playableTile__mainHeading">Two</a>
					<a class="playableTile__usernameHeading">Other</a>
				</div>
			</li>
		`);
		const cards = Array.from(root.querySelectorAll(TRACK_CARD));
		expect(getTracksFromCards(cards, baseUrl)).toEqual(
			getTracksFromRoot(root, baseUrl),
		);
	});
});

function loadBadgesViewFixture(): Element {
	const html = loadFixtureText('badges-view.html');
	document.body.innerHTML = html;

	const root = document.querySelector(TRACK_LIST_CONTAINER);
	if (root == null) {
		throw new Error(
			`Fixture root not found for selector ${TRACK_LIST_CONTAINER}`,
		);
	}

	return root;
}

describe('badges-view fixture', () => {
	it('extracts well-formed tracks and skips malformed/loading placeholders', () => {
		const baseUrl = 'https://soundcloud.com';
		const root = loadBadgesViewFixture();

		const cards = Array.from(root.querySelectorAll(TRACK_CARD));
		expect(cards).toHaveLength(5);

		const malformedCard = cards.find((card) => {
			return card.querySelector(TRACK_LINK)?.getAttribute('href') === '';
		});
		if (malformedCard == null) {
			throw new Error('Expected malformed card with empty href');
		}

		expect(malformedCard.querySelector(TRACK_TITLE)).toBeNull();
		expect(malformedCard.querySelector(TRACK_ARTIST)).toBeNull();

		const tracks = getTracksFromRoot(root, baseUrl);

		// Only 3 cards are well-formed: valid title + non-empty href.
		expect(tracks).toHaveLength(3);

		expect(tracks.map((t) => t.url)).toEqual([
			'https://soundcloud.com/datatransmissiondnb/nkz-run-away-rollout-records',
			'https://soundcloud.com/shorednb/bou-toxinate-bounce-shore',
			'https://soundcloud.com/datatransmissiondnb/apple-police-those-moves-subliminal-recordings',
		]);

		expect(tracks).toEqual([
			{
				title: "NKZ 'Run Away' [Rollout Records] *PREMIERE*",
				artist: 'NKZ',
				url: 'https://soundcloud.com/datatransmissiondnb/nkz-run-away-rollout-records',
				user_url: 'https://soundcloud.com/datatransmissiondnb',
				artwork_url:
					'https://i1.sndcdn.com/artworks-QPhQzEwsqobVlxam-cyaOVg-t500x500.png',
			},
			{
				title: 'Bou & Toxinate - Bounce (SHORE REMIX)',
				artist: 'SHORE',
				url: 'https://soundcloud.com/shorednb/bou-toxinate-bounce-shore',
				user_url: 'https://soundcloud.com/shorednb',
				artwork_url:
					'https://i1.sndcdn.com/artworks-xIhS2PjFLHgvS7dP-TciMsw-t500x500.jpg',
			},
			{
				title: "Apple Police 'Those Moves' [Sub-liminal Recordings] *PREMIERE*",
				artist: 'Apple Police',
				url: 'https://soundcloud.com/datatransmissiondnb/apple-police-those-moves-subliminal-recordings',
				user_url: 'https://soundcloud.com/datatransmissiondnb',
				artwork_url:
					'https://i1.sndcdn.com/artworks-cfziaPh9kyH3RUBl-VWi3jw-t500x500.png',
			},
		]);

		// Sanity check: malformed/loading cards shouldn’t contribute empty hrefs.
		expect(tracks.some((t) => t.url === '')).toBe(false);

		// Sanity check: malformed cards may still have artwork elements, but no parsed artwork URL.
		const malformedArtworkStyle =
			malformedCard.querySelector(TRACK_ARTWORK)?.getAttribute('style') ?? '';
		expect(malformedArtworkStyle).not.toContain('background-image');
	});
});
