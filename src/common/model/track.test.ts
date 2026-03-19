import { Either, Schema } from 'effect';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { decodeTrack, TrackSchema } from '@/common/model/track';

/** Wire-format raw track (string url) for decode input. Optional fields omitted when absent. */
const validRawTrack = fc
	.record({
		title: fc.string({ minLength: 1 }),
		artist: fc.string({ minLength: 1 }),
		url: fc.webUrl(),
		duration_ms: fc.integer({ min: 0 }),
	})
	.chain((base) =>
		fc
			.record({
				genre: fc.option(fc.string(), { nil: undefined }),
				tags: fc.option(fc.array(fc.string()), { nil: undefined }),
				artwork_url: fc.option(fc.webUrl(), { nil: undefined }),
				liked_at: fc.option(
					fc.date().map((d) => d.toISOString()),
					{ nil: undefined },
				),
				playback_count: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
				likes_count: fc.option(fc.integer({ min: 0 }), { nil: undefined }),
			})
			.map((opt) => {
				const extra: Record<string, unknown> = {};
				for (const [k, v] of Object.entries(opt)) {
					if (v !== undefined) extra[k] = v;
				}
				return { ...base, ...extra };
			}),
	);

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
		expect(decoded.artwork_url).toBe(
			'https://i1.sndcdn.com/artworks-xxx-large.jpg',
		);
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

describe('TrackSchema property tests', () => {
	it('property: any valid raw track decodes successfully, url is URL instance, required fields match', () => {
		fc.assert(
			fc.property(validRawTrack, (raw) => {
				const decoded = Schema.decodeUnknownEither(TrackSchema)(raw);
				Either.match(decoded, {
					onLeft: () => {
						throw new Error(`Expected Right, got Left: ${JSON.stringify(raw)}`);
					},
					onRight: (track) => {
						expect(track.url).toBeInstanceOf(URL);
						expect(track.title).toBe(raw.title);
						expect(track.artist).toBe(raw.artist);
						expect(track.url.href).toBe(new URL(raw.url).href);
						expect(track.duration_ms).toBe(raw.duration_ms);
					},
				});
			}),
		);
	});

	it('property: any valid track round-trips (decode → encode → decode yields equal)', () => {
		fc.assert(
			fc.property(validRawTrack, (raw) => {
				const decoded = Schema.decodeUnknownEither(TrackSchema)(raw);
				Either.match(decoded, {
					onLeft: () => {
						throw new Error(
							`Expected Right for round-trip: ${JSON.stringify(raw)}`,
						);
					},
					onRight: (track) => {
						const encoded = Schema.encodeSync(TrackSchema)(track);
						const decodedAgain = Schema.decodeUnknownSync(TrackSchema)(encoded);
						expect(decodedAgain.title).toBe(track.title);
						expect(decodedAgain.artist).toBe(track.artist);
						expect(decodedAgain.url.href).toBe(track.url.href);
						expect(decodedAgain.duration_ms).toBe(track.duration_ms);
						expect(decodedAgain.genre).toBe(track.genre);
						expect(decodedAgain.tags).toEqual(track.tags);
						expect(decodedAgain.artwork_url).toBe(track.artwork_url);
						expect(decodedAgain.liked_at).toBe(track.liked_at);
						expect(decodedAgain.playback_count).toBe(track.playback_count);
						expect(decodedAgain.likes_count).toBe(track.likes_count);
					},
				});
			}),
		);
	});

	it('property: corrupted inputs (missing fields, wrong types, negative duration, bad URL) are rejected', () => {
		const invalidRawTrack = fc.oneof(
			validRawTrack.chain((base) =>
				fc
					.constantFrom('title', 'artist', 'url', 'duration_ms')
					.map((key) =>
						Object.fromEntries(Object.entries(base).filter(([k]) => k !== key)),
					),
			),
			validRawTrack.chain((base) =>
				fc
					.record({
						title: fc.oneof(fc.integer(), fc.boolean(), fc.constant(null)),
						artist: fc.oneof(fc.integer(), fc.boolean(), fc.constant(null)),
						url: fc.oneof(fc.integer(), fc.boolean(), fc.constant(null)),
						duration_ms: fc.oneof(
							fc.string(),
							fc.integer({ max: -1 }),
							fc.double({ max: -0.0001 }),
						),
					})
					.map((corrupt) => ({ ...base, ...corrupt })),
			),
			fc.record({
				title: fc.string({ minLength: 1 }),
				artist: fc.string({ minLength: 1 }),
				url: fc.string({ minLength: 1 }).filter((s) => {
					try {
						new URL(s);
						return false;
					} catch {
						return true;
					}
				}),
				duration_ms: fc.integer({ min: 0 }),
			}),
		);

		fc.assert(
			fc.property(invalidRawTrack, (raw) => {
				const decoded = Schema.decodeUnknownEither(TrackSchema)(raw);
				Either.match(decoded, {
					onLeft: () => {
						// Expected: invalid input rejected
					},
					onRight: () => {
						throw new Error(
							`Expected Left for invalid input: ${JSON.stringify(raw)}`,
						);
					},
				});
			}),
		);
	});

	it('property: DOM-derived invalid shapes (empty url, null/undefined required, non-numeric duration) produce Left(InvalidTrack)', () => {
		const domInvalidShape = fc.oneof(
			validRawTrack.map((base) => ({ ...base, url: '' })),
			validRawTrack.map((base) => ({ ...base, title: null })),
			validRawTrack.map((base) => ({ ...base, artist: null })),
			validRawTrack.map((base) => ({ ...base, url: null })),
			validRawTrack.map((base) => ({ ...base, duration_ms: null })),
			validRawTrack.map((base) => ({ ...base, title: undefined })),
			validRawTrack.map((base) => ({ ...base, duration_ms: 'not-a-number' })),
		);

		fc.assert(
			fc.property(domInvalidShape, (raw) => {
				const result = decodeTrack(raw);
				Either.match(result, {
					onLeft: (err) => {
						expect(err._tag).toBe('InvalidTrack');
					},
					onRight: () => {
						throw new Error(
							`Expected Left(InvalidTrack) for DOM invalid: ${JSON.stringify(raw)}`,
						);
					},
				});
			}),
		);
	});
});
