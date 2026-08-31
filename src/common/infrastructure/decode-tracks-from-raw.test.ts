import { describe, expect, it } from 'vitest';
import { decodeTracksFromRaw } from '@/common/infrastructure/decode-tracks-from-raw';

describe('decodeTracksFromRaw', () => {
	it('returns empty array for empty input', () => {
		expect(decodeTracksFromRaw([])).toEqual([]);
	});

	it('decodes valid raw items to Track with url as URL instance', () => {
		const raw = [
			{
				title: 'Song',
				artist: 'Artist',
				url: 'https://soundcloud.com/artist/song',
			},
		];
		const tracks = decodeTracksFromRaw(raw);
		expect(tracks).toHaveLength(1);
		expect(tracks[0]?.title).toBe('Song');
		expect(tracks[0]?.artist).toBe('Artist');
		expect(tracks[0]?.url).toBeInstanceOf(URL);
		expect(tracks[0]?.url.toString()).toBe(
			'https://soundcloud.com/artist/song',
		);
	});

	it('skips items with invalid url', () => {
		const raw = [
			{
				title: 'Bad',
				artist: 'X',
				url: 'not-a-url',
			},
		];
		expect(decodeTracksFromRaw(raw)).toEqual([]);
	});

	it('strips legacy keys from raw tracks', () => {
		const raw = [
			{
				title: 'Song',
				artist: 'Artist',
				url: 'https://soundcloud.com/artist/song',
				genre: 'Drum & Bass',
				tags: ['Drum & Bass'],
				playback_count: 27565,
				likes_count: 1269,
			},
		];
		const tracks = decodeTracksFromRaw(raw);
		expect(tracks).toHaveLength(1);
		const track = tracks[0];
		if (track === undefined) throw new Error('expected one track');
		expect(track.title).toBe('Song');
		expect('genre' in track).toBe(false);
		expect('tags' in track).toBe(false);
		expect('playback_count' in track).toBe(false);
		expect('likes_count' in track).toBe(false);
	});

	it('returns only valid items when mix of valid and invalid', () => {
		const raw = [
			{
				title: 'Valid',
				artist: 'A',
				url: 'https://soundcloud.com/a/valid',
			},
			{
				title: 'Invalid URL',
				artist: 'B',
				url: 'not-a-url',
			},
			{
				title: 'Valid Two',
				artist: 'C',
				url: 'https://soundcloud.com/c/two',
			},
		];
		const tracks = decodeTracksFromRaw(raw);
		expect(tracks).toHaveLength(2);
		expect(tracks[0]?.title).toBe('Valid');
		expect(tracks[1]?.title).toBe('Valid Two');
	});
});
