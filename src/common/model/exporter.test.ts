import { buildExportPayload } from '@/common/model/exporter';
import type { Track } from '@/common/model/track';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

function validTrack(overrides?: Partial<Track>): Track {
	return {
		title: 'Track',
		artist: 'Artist',
		url: new URL('https://soundcloud.com/artist/track'),
		...overrides,
	};
}

describe('buildExportPayload', () => {
	it('output has format_version 1', () => {
		const payload = buildExportPayload({ tracks: [] });
		expect(payload.format_version).toBe(1);
	});

	it('output has exported_at as ISO string', () => {
		const payload = buildExportPayload({ tracks: [] });
		expect(typeof payload.exported_at).toBe('string');
		expect(payload.exported_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it('output has default source_url and user', () => {
		const payload = buildExportPayload({ tracks: [] });
		expect(payload.source_url).toBe('https://soundcloud.com/you/likes');
		expect(payload.user).toBe('');
	});

	it('output respects provided source_url, exported_at, and user', () => {
		const payload = buildExportPayload({
			tracks: [],
			source_url: 'https://example.com',
			exported_at: '2024-01-15T12:00:00.000Z',
			user: 'myusername',
		});
		expect(payload.source_url).toBe('https://example.com');
		expect(payload.exported_at).toBe('2024-01-15T12:00:00.000Z');
		expect(payload.user).toBe('myusername');
	});

	it('track_count equals tracks length', () => {
		const tracks = [validTrack(), validTrack()];
		const payload = buildExportPayload({ tracks });
		expect(payload.track_count).toBe(2);
		expect(payload.tracks).toHaveLength(2);
	});

	it('tracks are serialized with url as string', () => {
		const url = new URL('https://soundcloud.com/u/s');
		const tracks = [validTrack({ url })];
		const payload = buildExportPayload({ tracks });
		expect(payload.tracks[0]).toEqual({
			title: 'Track',
			artist: 'Artist',
			url: 'https://soundcloud.com/u/s',
		});
	});

	it('tracks include optional v1 fields when present', () => {
		const tracks = [
			validTrack({
				artwork_url: 'https://i1.sndcdn.com/artworks-x.jpg',
				user_url: 'https://soundcloud.com/artist',
			}),
		];
		const payload = buildExportPayload({ tracks });
		expect(payload.tracks[0]).toMatchObject({
			title: 'Track',
			artist: 'Artist',
			url: 'https://soundcloud.com/artist/track',
			artwork_url: 'https://i1.sndcdn.com/artworks-x.jpg',
			user_url: 'https://soundcloud.com/artist',
		});
	});

	it('tracks omit optional fields when undefined', () => {
		const tracks = [validTrack()];
		const payload = buildExportPayload({ tracks });
		expect(payload.tracks).toHaveLength(1);
		const t = payload.tracks[0];
		if (t === undefined) throw new Error('expected one track');
		expect(t).toEqual({
			title: 'Track',
			artist: 'Artist',
			url: 'https://soundcloud.com/artist/track',
		});
		expect('artwork_url' in t).toBe(false);
		expect('user_url' in t).toBe(false);
	});

	it('property: any valid track array yields correct shape and format_version', () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.record({
						title: fc.string(),
						artist: fc.string(),
						url: fc.webUrl(),
					}),
					{ maxLength: 50 },
				),
				(records) => {
					const tracks: Track[] = records.map((r) => ({
						...r,
						url: new URL(r.url),
					}));
					const payload = buildExportPayload({ tracks });
					expect(payload.format_version).toBe(1);
					expect(payload.track_count).toBe(tracks.length);
					expect(payload.tracks).toHaveLength(tracks.length);
					expect(typeof payload.exported_at).toBe('string');
					expect(typeof payload.source_url).toBe('string');
					expect(typeof payload.user).toBe('string');
					for (const t of payload.tracks) {
						expect(typeof t.title).toBe('string');
						expect(typeof t.artist).toBe('string');
						expect(typeof t.url).toBe('string');
					}
				},
			),
		);
	});
});
