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
		user_url: fc.option(fc.webUrl(), { nil: undefined }),
		genre: fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
		tags: fc.option(
			fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
			{ nil: undefined },
		),
		playback_count: fc.option(fc.nat(), { nil: undefined }),
		likes_count: fc.option(fc.nat(), { nil: undefined }),
	})
	.map(
		({
			artwork_url,
			user_url,
			genre,
			tags,
			playback_count,
			likes_count,
			...base
		}) => ({
			...base,
			...(artwork_url !== undefined && { artwork_url }),
			...(user_url !== undefined && { user_url }),
			...(genre !== undefined && { genre }),
			...(tags !== undefined && { tags }),
			...(playback_count !== undefined && { playback_count }),
			...(likes_count !== undefined && { likes_count }),
		}),
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
		expect(decoded.user_url).toBeUndefined();
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
		expect(decoded.user_url).toBeUndefined();
	});

	it('decodes with optional genre', () => {
		const raw = {
			title: 'Song',
			artist: 'Artist',
			url: 'https://soundcloud.com/artist/song',
			genre: 'Drum & Bass',
		};
		const decoded = Schema.decodeUnknownSync(TrackSchema)(raw);
		expect(decoded.genre).toBe('Drum & Bass');
	});

	it('decodes with optional tags', () => {
		const raw = {
			title: 'Song',
			artist: 'Artist',
			url: 'https://soundcloud.com/artist/song',
			tags: ['Drum & Bass', 'Bass'],
		};
		const decoded = Schema.decodeUnknownSync(TrackSchema)(raw);
		expect(decoded.tags).toEqual(['Drum & Bass', 'Bass']);
	});

	it('decodes with optional playback_count and likes_count', () => {
		const raw = {
			title: 'Song',
			artist: 'Artist',
			url: 'https://soundcloud.com/artist/song',
			playback_count: 27565,
			likes_count: 1269,
		};
		const decoded = Schema.decodeUnknownSync(TrackSchema)(raw);
		expect(decoded.playback_count).toBe(27565);
		expect(decoded.likes_count).toBe(1269);
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
		expect(decoded.user_url).toBeUndefined();
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
						const trackUserUrl =
							'user_url' in track ? track.user_url : undefined;
						const rawUserUrl = 'user_url' in raw ? raw.user_url : undefined;
						expect(trackUserUrl).toBe(rawUserUrl);
						const trackGenre = 'genre' in track ? track.genre : undefined;
						const rawGenre = 'genre' in raw ? raw.genre : undefined;
						expect(trackGenre).toBe(rawGenre);
						const trackTags = 'tags' in track ? track.tags : undefined;
						const rawTags = 'tags' in raw ? raw.tags : undefined;
						expect(trackTags).toEqual(rawTags);
						const trackPlaybackCount =
							'playback_count' in track ? track.playback_count : undefined;
						const rawPlaybackCount =
							'playback_count' in raw ? raw.playback_count : undefined;
						expect(trackPlaybackCount).toBe(rawPlaybackCount);
						const trackLikesCount =
							'likes_count' in track ? track.likes_count : undefined;
						const rawLikesCount =
							'likes_count' in raw ? raw.likes_count : undefined;
						expect(trackLikesCount).toBe(rawLikesCount);
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
						const decodedAgainUserUrl =
							'user_url' in decodedAgain ? decodedAgain.user_url : undefined;
						const trackUserUrl =
							'user_url' in track ? track.user_url : undefined;
						expect(decodedAgainUserUrl).toBe(trackUserUrl);
						const decodedAgainGenre =
							'genre' in decodedAgain ? decodedAgain.genre : undefined;
						const trackGenre = 'genre' in track ? track.genre : undefined;
						expect(decodedAgainGenre).toBe(trackGenre);
						const decodedAgainTags =
							'tags' in decodedAgain ? decodedAgain.tags : undefined;
						const trackTags = 'tags' in track ? track.tags : undefined;
						expect(decodedAgainTags).toEqual(trackTags);
						const decodedAgainPlaybackCount =
							'playback_count' in decodedAgain
								? decodedAgain.playback_count
								: undefined;
						const trackPlaybackCount =
							'playback_count' in track ? track.playback_count : undefined;
						expect(decodedAgainPlaybackCount).toBe(trackPlaybackCount);
						const decodedAgainLikesCount =
							'likes_count' in decodedAgain
								? decodedAgain.likes_count
								: undefined;
						const trackLikesCount =
							'likes_count' in track ? track.likes_count : undefined;
						expect(decodedAgainLikesCount).toBe(trackLikesCount);
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
						user_url: fc.oneof(
							fc.integer({ max: -1 }),
							fc.constant(null),
							fc.boolean(),
						),
						genre: fc.oneof(fc.integer(), fc.constant(null), fc.boolean()),
						tags: fc.oneof(fc.integer(), fc.constant(null), fc.boolean()),
						playback_count: fc.oneof(
							fc.string(),
							fc.constant(null),
							fc.boolean(),
						),
						likes_count: fc.oneof(fc.string(), fc.constant(null), fc.boolean()),
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
				user_url: fc.option(fc.oneof(fc.integer(), fc.constant(null)), {
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
