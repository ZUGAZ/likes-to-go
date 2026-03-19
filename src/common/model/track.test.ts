import { Either, Schema } from 'effect';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { TrackSchema } from '@/common/model/track';

/** Wire-format raw track (string url) for decode input. Optional fields omitted when absent. */
const validRawTrack = fc
	.record({
		title: fc.string({ minLength: 1 }),
		artist: fc.string({ minLength: 1 }),
		url: fc.webUrl(),
		artwork_url: fc.option(fc.webUrl(), { nil: undefined }),
	})
	.map(({ artwork_url, ...base }) =>
		artwork_url === undefined ? base : { ...base, artwork_url },
	);

describe('TrackSchema', () => {
	it('decodes valid object with url string to Track', () => {
		const raw = {
			title: 'Song',
			artist: 'Artist',
			url: 'https://soundcloud.com/artist/song',
		};
		const decoded = Schema.decodeUnknownSync(TrackSchema)(raw);
		expect(decoded.title).toBe('Song');
		expect(decoded.artist).toBe('Artist');
		expect(decoded.url).toBeInstanceOf(URL);
		expect(decoded.url.toString()).toBe('https://soundcloud.com/artist/song');
		expect(decoded.artwork_url).toBeUndefined();
	});

	it('decodes with optional artwork_url', () => {
		const raw = {
			title: 'Song',
			artist: 'Artist',
			url: 'https://soundcloud.com/artist/song',
			artwork_url: 'https://i1.sndcdn.com/artworks-abc-t500x500.png',
		};
		const decoded = Schema.decodeUnknownSync(TrackSchema)(raw);
		expect(decoded.artwork_url).toBe(raw.artwork_url);
	});

	it('decodes minimal object (required fields only); artwork_url undefined', () => {
		const raw = {
			title: 'Minimal',
			artist: 'Artist',
			url: 'https://soundcloud.com/artist/minimal',
		};
		const decoded = Schema.decodeUnknownSync(TrackSchema)(raw);
		expect(decoded.title).toBe('Minimal');
		expect(decoded.artwork_url).toBeUndefined();
	});

	it('rejects invalid url', () => {
		const raw = {
			title: 'Song',
			artist: 'Artist',
			url: 'not-a-url',
		};
		expect(() => Schema.decodeUnknownSync(TrackSchema)(raw)).toThrow();
	});

	it('rejects missing required fields', () => {
		expect(() =>
			Schema.decodeUnknownSync(TrackSchema)({ title: 'X' }),
		).toThrow();
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
						const trackArtworkUrl =
							'artwork_url' in track ? track.artwork_url : undefined;
						const rawArtworkUrl =
							'artwork_url' in raw ? raw.artwork_url : undefined;
						expect(trackArtworkUrl).toBe(rawArtworkUrl);
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
						const decodedAgainArtworkUrl =
							'artwork_url' in decodedAgain
								? decodedAgain.artwork_url
								: undefined;
						const trackArtworkUrl =
							'artwork_url' in track ? track.artwork_url : undefined;
						expect(decodedAgainArtworkUrl).toBe(trackArtworkUrl);
					},
				});
			}),
		);
	});

	it('property: corrupted inputs (missing fields, wrong types, bad URL, wrong optional type) are rejected', () => {
		const invalidRawTrack = fc.oneof(
			validRawTrack.chain((base) =>
				fc
					.constantFrom('title', 'artist', 'url')
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
						artwork_url: fc.oneof(
							fc.integer({ max: -1 }),
							fc.constant(null),
							fc.boolean(),
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
				artwork_url: fc.option(fc.oneof(fc.integer(), fc.constant(null)), {
					nil: undefined,
				}),
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
});
