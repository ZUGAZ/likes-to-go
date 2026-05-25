import { Either, Schema } from 'effect';
import { describe, expect, it } from '@effect/vitest';
import { loadFixtureText } from '@/common/tests/fixture-loaders';
import { readListTracksFromCards } from '@/layout/infrastructure/layouts/list/read-list-tracks-from-cards';
import { trackCard } from '@/layout/infrastructure/layouts/list/selectors';
import { TRACK_LIST_CONTAINER } from '@/layout/infrastructure/selectors/shared';
import { RawTrackSchema } from '@/layout/model/raw-track';

function createCard(html: string): Element {
	const card = document.createElement('li');
	card.className = 'soundList__item';
	card.innerHTML = html;
	return card;
}

describe('readListTracksFromCards', () => {
	const baseUrl = 'https://soundcloud.com';

	it('merges core fields with list metadata', () => {
		const card = createCard(`
			<a class="sound__coverArt" href="/artist/track"></a>
			<a class="soundTitle__title">Track Title</a>
			<a class="soundTitle__username" href="/artist">Artist Name</a>
			<a class="sc-tag soundTitle__tag"><span class="sc-tagContent">Drum &amp; Bass</span></a>
			<ul>
				<li title="27,565 plays" class="sc-ministats-item">
					<span class="sc-ministats sc-ministats-plays"></span>
				</li>
			</ul>
			<button class="sc-button-like"><span class="sc-button-label">1,269</span></button>
		`);
		const tracks = readListTracksFromCards([card], baseUrl);
		expect(tracks).toEqual([
			{
				title: 'Track Title',
				artist: 'Artist Name',
				url: 'https://soundcloud.com/artist/track',
				user_url: 'https://soundcloud.com/artist',
				genre: 'Drum & Bass',
				tags: ['Drum & Bass'],
				playback_count: 27565,
				likes_count: 1269,
			},
		]);
	});

	it('omits genre and tags when tag markup is absent', () => {
		const card = createCard(`
			<a class="sound__coverArt" href="/artist/track"></a>
			<a class="soundTitle__title">Track Title</a>
			<a class="soundTitle__username" href="/artist">Artist Name</a>
			<ul>
				<li title="1,000 plays" class="sc-ministats-item">
					<span class="sc-ministats sc-ministats-plays"></span>
				</li>
			</ul>
			<button class="sc-button-like"><span class="sc-button-label">96</span></button>
		`);
		const tracks = readListTracksFromCards([card], baseUrl);
		expect(tracks).toHaveLength(1);
		const track = tracks[0];
		if (track == null) throw new Error('expected track');
		expect(track.playback_count).toBe(1000);
		expect(track.likes_count).toBe(96);
		expect('genre' in track).toBe(false);
		expect('tags' in track).toBe(false);
	});

	it('skips cards without core fields', () => {
		const card = createCard(`
			<a class="sound__coverArt" href=""></a>
			<a class="soundTitle__username">Artist</a>
		`);
		expect(readListTracksFromCards([card], baseUrl)).toEqual([]);
	});

	it('returns objects satisfying RawTrackSchema from list-view fixture', () => {
		document.body.innerHTML = loadFixtureText('list-view.html');
		const root = document.querySelector(TRACK_LIST_CONTAINER);
		if (root == null) throw new Error('fixture root missing');
		const cards = Array.from(root.querySelectorAll(trackCard));
		const tracks = readListTracksFromCards(cards, baseUrl);

		expect(tracks).toHaveLength(3);
		for (const track of tracks) {
			const decoded = Schema.decodeUnknownEither(RawTrackSchema)(track);
			expect(Either.isRight(decoded)).toBe(true);
		}

		expect(tracks[0]).toMatchObject({
			genre: 'Drum & Bass',
			tags: ['Drum & Bass'],
			playback_count: 27565,
			likes_count: 1269,
		});
		expect(tracks[1]).toMatchObject({
			genre: 'Bass',
			tags: ['Bass'],
			playback_count: 5000,
			likes_count: 500,
		});
		expect(tracks[2]?.playback_count).toBe(1000);
		expect(tracks[2]?.likes_count).toBe(96);
		expect('genre' in (tracks[2] ?? {})).toBe(false);
	});
});
