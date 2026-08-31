import {
	m3uExportFormat,
	renderM3uExport,
} from '@/common/model/export-format/m3u';
import type { Track } from '@/common/model/track';
import { describe, expect, it } from 'vitest';

function validTrack(overrides?: Partial<Track>): Track {
	return {
		title: 'Track',
		artist: 'Artist',
		url: new URL('https://soundcloud.com/artist/track'),
		...overrides,
	};
}

describe('renderM3uExport', () => {
	it('emits a header-only body with a trailing newline for an empty track list', () => {
		expect(renderM3uExport([])).toBe('#EXTM3U\n');
	});

	it('emits EXTINF -1 and the SoundCloud page URL for one track', () => {
		expect(renderM3uExport([validTrack()])).toBe(
			'#EXTM3U\n#EXTINF:-1,Artist - Track\nhttps://soundcloud.com/artist/track\n',
		);
	});

	it('matches the two-track playlist shape with a trailing newline', () => {
		const body = renderM3uExport([
			validTrack({
				artist: 'Artist One',
				title: 'Title One',
				url: new URL('https://soundcloud.com/artist-one/title-one'),
			}),
			validTrack({
				artist: 'Artist Two',
				title: 'Title Two',
				url: new URL('https://soundcloud.com/artist-two/title-two'),
			}),
		]);
		expect(body).toBe(
			'#EXTM3U\n#EXTINF:-1,Artist One - Title One\nhttps://soundcloud.com/artist-one/title-one\n#EXTINF:-1,Artist Two - Title Two\nhttps://soundcloud.com/artist-two/title-two\n',
		);
		expect(body.endsWith('\n')).toBe(true);
		expect(body.includes('\r')).toBe(false);
	});

	it('preserves input order', () => {
		expect(
			renderM3uExport([
				validTrack({
					artist: 'First',
					title: 'One',
					url: new URL('https://soundcloud.com/first/one'),
				}),
				validTrack({
					artist: 'Second',
					title: 'Two',
					url: new URL('https://soundcloud.com/second/two'),
				}),
				validTrack({
					artist: 'Third',
					title: 'Three',
					url: new URL('https://soundcloud.com/third/three'),
				}),
			]),
		).toBe(
			'#EXTM3U\n#EXTINF:-1,First - One\nhttps://soundcloud.com/first/one\n#EXTINF:-1,Second - Two\nhttps://soundcloud.com/second/two\n#EXTINF:-1,Third - Three\nhttps://soundcloud.com/third/three\n',
		);
	});

	it('leaves commas in artist and title unquoted', () => {
		expect(
			renderM3uExport([
				validTrack({
					artist: 'A, B',
					title: 'C, D',
				}),
			]),
		).toBe(
			'#EXTM3U\n#EXTINF:-1,A, B - C, D\nhttps://soundcloud.com/artist/track\n',
		);
	});

	it('collapses CR, LF, and CRLF in artist and title to a single space', () => {
		expect(
			renderM3uExport([
				validTrack({
					artist: 'Art\r\nist\nName\rHere',
					title: 'Ti\r\ntle\nWith\rBreaks',
				}),
			]),
		).toBe(
			'#EXTM3U\n#EXTINF:-1,Art ist Name Here - Ti tle With Breaks\nhttps://soundcloud.com/artist/track\n',
		);
	});

	it('uses duration -1 and page URLs, never a numeric duration or stream URL', () => {
		const body = renderM3uExport([
			validTrack({
				url: new URL('https://soundcloud.com/artist/track'),
			}),
		]);
		const extInfLines = body
			.split('\n')
			.filter((line) => line.startsWith('#EXTINF:'));
		expect(extInfLines).toEqual(['#EXTINF:-1,Artist - Track']);
		expect(body).not.toMatch(/#EXTINF:\d+/);
		expect(body).toContain('https://soundcloud.com/artist/track');
		expect(body).not.toContain('.m3u8');
		expect(body).not.toContain('hls');
	});
});

describe('m3uExportFormat', () => {
	it('exposes locked M3U metadata', () => {
		expect(m3uExportFormat.id).toBe('m3u');
		expect(m3uExportFormat.label).toBe('M3U');
		expect(m3uExportFormat.extension).toBe('m3u');
		expect(m3uExportFormat.worksWith).toBe(
			'Track links — not a playable stream.',
		);
		expect(m3uExportFormat.pickerTypes).toEqual([
			{
				description: 'M3U playlist',
				accept: { 'audio/x-mpegurl': ['.m3u'] },
			},
		]);
	});

	it('renders through the format definition', () => {
		expect(m3uExportFormat.render([validTrack()])).toBe(
			'#EXTM3U\n#EXTINF:-1,Artist - Track\nhttps://soundcloud.com/artist/track\n',
		);
	});
});
