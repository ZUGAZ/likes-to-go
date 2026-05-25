import { Either, Schema } from 'effect';
import { describe, expect, it } from '@effect/vitest';
import { decodeTracksFromRaw } from '@/common/infrastructure/decode-tracks-from-raw';
import { loadFixtureText } from '@/common/tests/fixture-loaders';
import {
	listSelectorSet,
	trackCard,
	trackLink,
} from '@/layout/infrastructure/layouts/list';
import { trackArtwork } from '@/layout/infrastructure/layouts/list/selectors';
import {
	readTracksFromCards,
	readTracksFromRoot,
} from '@/layout/infrastructure/read-tracks-from-cards';
import { TRACK_LIST_CONTAINER } from '@/layout/infrastructure/selectors/shared';
import { RawTrackSchema } from '@/layout/model/raw-track';

function createFixture(innerHTML: string): Element {
	const root = document.createElement('ul');
	root.className = 'lazyLoadingList__list';
	root.innerHTML = innerHTML;
	return root;
}

describe('readTracksFromRoot (list layout)', () => {
	const baseUrl = 'https://soundcloud.com';

	it('returns empty array when no cards', () => {
		const root = createFixture('<p>no tracks</p>');
		expect(readTracksFromRoot(root, baseUrl, listSelectorSet)).toEqual([]);
	});

	it('parses a single list card with soundList selectors', () => {
		const root = createFixture(`
			<li class="soundList__item">
				<div class="sound">
					<div class="sound__body">
						<div class="sound__artwork">
							<a class="sound__coverArt" href="/artist-one/track-a"></a>
						</div>
						<div class="sound__content">
							<a href="/artist-one" class="soundTitle__username">Artist One</a>
							<a class="soundTitle__title"><span>Track A</span></a>
						</div>
					</div>
				</div>
			</li>
		`);
		const tracks = readTracksFromRoot(root, baseUrl, listSelectorSet);
		expect(tracks).toEqual([
			{
				title: 'Track A',
				artist: 'Artist One',
				url: 'https://soundcloud.com/artist-one/track-a',
				user_url: 'https://soundcloud.com/artist-one',
			},
		]);
	});

	it('skips cards without title or url', () => {
		const root = createFixture(`
			<li class="soundList__item">
				<div class="sound">
					<a class="sound__coverArt" href=""></a>
					<a class="soundTitle__title">No link</a>
					<a class="soundTitle__username">Who</a>
				</div>
			</li>
			<li class="soundList__item">
				<div class="sound">
					<a class="sound__coverArt" href="/artist/track"></a>
					<a class="soundTitle__username">Artist</a>
				</div>
			</li>
		`);
		const tracks = readTracksFromRoot(root, baseUrl, listSelectorSet);
		expect(tracks).toHaveLength(0);
	});

	it('extracts artwork_url from .sound__artwork .sc-artwork.image__full style', () => {
		const root = createFixture(`
			<li class="soundList__item">
				<div class="sound">
					<div class="sound__artwork">
						<a class="sound__coverArt" href="/artist/track"></a>
						<span class="sc-artwork image__full" style="background-image: url(&quot;https://i1.sndcdn.com/artworks-abc-t500x500.png&quot;);"></span>
					</div>
					<a class="soundTitle__title">Track</a>
					<a class="soundTitle__username">Artist</a>
				</div>
			</li>
		`);
		const tracks = readTracksFromRoot(root, baseUrl, listSelectorSet);
		expect(tracks).toHaveLength(1);
		expect(tracks[0]?.artwork_url).toBe(
			'https://i1.sndcdn.com/artworks-abc-t500x500.png',
		);
	});

	it('readTracksFromCards matches readTracksFromRoot when given all cards from root', () => {
		const root = createFixture(`
			<li class="soundList__item">
				<a class="sound__coverArt" href="/a/b"></a>
				<a class="soundTitle__title">One</a>
				<a class="soundTitle__username">Artist</a>
			</li>
			<li class="soundList__item">
				<a class="sound__coverArt" href="/c/d"></a>
				<a class="soundTitle__title">Two</a>
				<a class="soundTitle__username">Other</a>
			</li>
		`);
		const cards = Array.from(root.querySelectorAll(trackCard));
		expect(readTracksFromCards(cards, baseUrl, listSelectorSet)).toEqual(
			readTracksFromRoot(root, baseUrl, listSelectorSet),
		);
	});

	it('trackCardsFromIndex(0) returns same tracks as querying all cards', () => {
		const root = createFixture(`
			<li class="soundList__item">
				<a class="sound__coverArt" href="/a/b"></a>
				<a class="soundTitle__title">One</a>
				<a class="soundTitle__username">Artist</a>
			</li>
			<li class="soundList__item">
				<a class="sound__coverArt" href="/c/d"></a>
				<a class="soundTitle__title">Two</a>
				<a class="soundTitle__username">Other</a>
			</li>
		`);
		const fromIndexCards = Array.from(
			root.querySelectorAll(listSelectorSet.trackCardsFromIndex(0)),
		);
		const allCards = Array.from(root.querySelectorAll(trackCard));
		expect(fromIndexCards).toHaveLength(allCards.length);
		expect(
			readTracksFromCards(fromIndexCards, baseUrl, listSelectorSet),
		).toEqual(readTracksFromCards(allCards, baseUrl, listSelectorSet));
	});
});

function loadListViewFixture(): Element {
	const html = loadFixtureText('list-view.html');
	document.body.innerHTML = html;

	const root = document.querySelector(TRACK_LIST_CONTAINER);
	if (root == null) {
		throw new Error(
			`Fixture root not found for selector ${TRACK_LIST_CONTAINER}`,
		);
	}

	return root;
}

describe('list-view fixture', () => {
	const baseUrl = 'https://soundcloud.com';

	it('extracts well-formed tracks and skips malformed cards', () => {
		const root = loadListViewFixture();

		const cards = Array.from(root.querySelectorAll(trackCard));
		expect(cards).toHaveLength(4);

		const malformedCard = cards.find((card) => {
			return card.querySelector(trackLink)?.getAttribute('href') === '';
		});
		if (malformedCard == null) {
			throw new Error('Expected malformed card with empty href');
		}
		expect(malformedCard.querySelector(listSelectorSet.trackTitle)).toBeNull();

		const tracks = readTracksFromRoot(root, baseUrl, listSelectorSet);
		expect(tracks).toHaveLength(3);

		expect(tracks.map((t) => t.url)).toEqual([
			'https://soundcloud.com/neurophoria_dnb/arax-enif-round-smrlbsv2',
			'https://soundcloud.com/kosenprod/nais-obscura-bass-kosen-42',
			'https://soundcloud.com/techniquerecordings/2db-spud-gun-technique',
		]);

		expect(tracks).toEqual([
			{
				title: 'Arax & Enif - Round',
				artist: 'Neurophoria',
				url: 'https://soundcloud.com/neurophoria_dnb/arax-enif-round-smrlbsv2',
				user_url: 'https://soundcloud.com/neurophoria_dnb',
				artwork_url: 'https://i1.sndcdn.com/artworks-arax-enif-t500x500.png',
			},
			{
				title: 'Nais - Obscura Bass [KOSEN 42]',
				artist: 'Nais',
				url: 'https://soundcloud.com/kosenprod/nais-obscura-bass-kosen-42',
				user_url: 'https://soundcloud.com/kosenprod',
			},
			{
				title: '2DB - Spud Gun ( Crossfire EP 2 )',
				artist: 'TechniqueRecordings',
				url: 'https://soundcloud.com/techniquerecordings/2db-spud-gun-technique',
				user_url: 'https://soundcloud.com/techniquerecordings',
			},
		]);

		expect(tracks.some((t) => t.url === '')).toBe(false);

		const malformedArtworkStyle =
			malformedCard.querySelector(trackArtwork)?.getAttribute('style') ?? '';
		expect(malformedArtworkStyle).not.toContain('background-image');
	});

	it('decodes parsed tracks to valid Track[] via decodeTracksFromRaw', () => {
		const root = loadListViewFixture();
		const raw = readTracksFromRoot(root, baseUrl, listSelectorSet);

		for (const track of raw) {
			const decoded = Schema.decodeUnknownEither(RawTrackSchema)(track);
			expect(Either.isRight(decoded)).toBe(true);
		}

		const tracks = decodeTracksFromRaw(raw);
		expect(tracks).toHaveLength(3);
		for (const track of tracks) {
			expect(track.url).toBeInstanceOf(URL);
		}
		expect(tracks[0]?.url.toString()).toBe(
			'https://soundcloud.com/neurophoria_dnb/arax-enif-round-smrlbsv2',
		);
	});
});
