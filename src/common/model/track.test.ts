import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';
import { decodeTrack, TrackSchema } from '@/common/model/track';

describe('TrackSchema', () => {
	it('decodes valid object with url string to Track', () => {
		const raw = {
			title: 'Song',
			artist: 'Artist',
			url: 'https://soundcloud.com/artist/song',
			duration_ms: 180000,
		};
		const decoded = Schema.decodeUnknownSync(TrackSchema)(raw);
		expect(decoded.title).toBe('Song');
		expect(decoded.artist).toBe('Artist');
		expect(decoded.url).toBeInstanceOf(URL);
		expect(decoded.url.toString()).toBe('https://soundcloud.com/artist/song');
		expect(decoded.duration_ms).toBe(180000);
	});

	it('decodes zero duration', () => {
		const raw = {
			title: 'X',
			artist: 'Y',
			url: 'https://example.com/track',
			duration_ms: 0,
		};
		const decoded = Schema.decodeUnknownSync(TrackSchema)(raw);
		expect(decoded.duration_ms).toBe(0);
	});

	it('decodes minimal object (required fields only); optionals undefined', () => {
		const raw = {
			title: 'Minimal',
			artist: 'Artist',
			url: 'https://soundcloud.com/artist/minimal',
			duration_ms: 120000,
		};
		const decoded = Schema.decodeUnknownSync(TrackSchema)(raw);
		expect(decoded.title).toBe('Minimal');
		expect(decoded.genre).toBeUndefined();
		expect(decoded.tags).toBeUndefined();
		expect(decoded.artwork_url).toBeUndefined();
		expect(decoded.liked_at).toBeUndefined();
		expect(decoded.playback_count).toBeUndefined();
		expect(decoded.likes_count).toBeUndefined();
	});

	it('decodes full object with all optional fields', () => {
		const raw = {
			title: 'Full',
			artist: 'Artist',
			url: 'https://soundcloud.com/artist/full',
			duration_ms: 215000,
			genre: 'Electronic',
			tags: ['ambient', 'chill'],
			artwork_url: 'https://i1.sndcdn.com/artworks-xxx-large.jpg',
			liked_at: '2026-01-15T08:30:00Z',
			playback_count: 12500,
			likes_count: 890,
		};
		const decoded = Schema.decodeUnknownSync(TrackSchema)(raw);
		expect(decoded.title).toBe('Full');
		expect(decoded.genre).toBe('Electronic');
		expect(decoded.tags).toEqual(['ambient', 'chill']);
		expect(decoded.artwork_url).toBe('https://i1.sndcdn.com/artworks-xxx-large.jpg');
		expect(decoded.liked_at).toBe('2026-01-15T08:30:00Z');
		expect(decoded.playback_count).toBe(12500);
		expect(decoded.likes_count).toBe(890);
	});

	it('decodes with only some optionals present', () => {
		const raw = {
			title: 'Partial',
			artist: 'Artist',
			url: 'https://soundcloud.com/artist/partial',
			duration_ms: 90000,
			artwork_url: 'https://i1.sndcdn.com/artworks-yyy.jpg',
			playback_count: 42,
		};
		const decoded = Schema.decodeUnknownSync(TrackSchema)(raw);
		expect(decoded.artwork_url).toBe('https://i1.sndcdn.com/artworks-yyy.jpg');
		expect(decoded.playback_count).toBe(42);
		expect(decoded.genre).toBeUndefined();
		expect(decoded.tags).toBeUndefined();
		expect(decoded.liked_at).toBeUndefined();
		expect(decoded.likes_count).toBeUndefined();
	});

	it('rejects invalid url', () => {
		const raw = {
			title: 'Song',
			artist: 'Artist',
			url: 'not-a-url',
			duration_ms: 100,
		};
		expect(() => Schema.decodeUnknownSync(TrackSchema)(raw)).toThrow();
	});

	it('rejects negative duration', () => {
		const raw = {
			title: 'Song',
			artist: 'Artist',
			url: 'https://soundcloud.com/a/b',
			duration_ms: -1,
		};
		expect(() => Schema.decodeUnknownSync(TrackSchema)(raw)).toThrow();
	});

	it('rejects missing required fields', () => {
		expect(() =>
			Schema.decodeUnknownSync(TrackSchema)({ title: 'X' }),
		).toThrow();
	});
});

describe('decodeTrack', () => {
	it('returns Right(Track) for valid minimal input', () => {
		const raw = {
			title: 'Song',
			artist: 'Artist',
			url: 'https://soundcloud.com/artist/song',
			duration_ms: 180000,
		};
		const result = decodeTrack(raw);
		expect(result._tag).toBe('Right');
		if (result._tag === 'Right') {
			expect(result.right.title).toBe('Song');
			expect(result.right.url).toBeInstanceOf(URL);
		}
	});

	it('returns Right(Track) for valid full input', () => {
		const raw = {
			title: 'Full',
			artist: 'Artist',
			url: 'https://soundcloud.com/artist/full',
			duration_ms: 100,
			genre: 'DnB',
			tags: ['drum and bass'],
			playback_count: 1000,
		};
		const result = decodeTrack(raw);
		expect(result._tag).toBe('Right');
		if (result._tag === 'Right') {
			expect(result.right.genre).toBe('DnB');
			expect(result.right.playback_count).toBe(1000);
		}
	});

	it('returns Left(InvalidTrack) for invalid url', () => {
		const raw = {
			title: 'Song',
			artist: 'Artist',
			url: 'not-a-url',
			duration_ms: 100,
		};
		const result = decodeTrack(raw);
		expect(result._tag).toBe('Left');
		if (result._tag === 'Left') {
			expect(result.left._tag).toBe('InvalidTrack');
			expect(result.left.reason).toBeDefined();
			expect(typeof result.left.reason).toBe('string');
		}
	});

	it('returns Left(InvalidTrack) for negative duration', () => {
		const raw = {
			title: 'Song',
			artist: 'Artist',
			url: 'https://soundcloud.com/a/b',
			duration_ms: -1,
		};
		const result = decodeTrack(raw);
		expect(result._tag).toBe('Left');
		if (result._tag === 'Left') {
			expect(result.left._tag).toBe('InvalidTrack');
		}
	});

	it('returns Left(InvalidTrack) for missing required fields', () => {
		const result = decodeTrack({ title: 'X' });
		expect(result._tag).toBe('Left');
		if (result._tag === 'Left') {
			expect(result.left._tag).toBe('InvalidTrack');
		}
	});
});
