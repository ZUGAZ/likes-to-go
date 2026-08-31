import { renderExportBody } from '@/common/model/export-format/render-export-body';
import { buildExportPayload } from '@/common/model/exporter';
import type { Track } from '@/common/model/track';
import { afterEach, describe, expect, it, vi } from 'vitest';

function validTrack(): Track {
	return {
		title: 'Track',
		artist: 'Artist',
		url: new URL('https://soundcloud.com/artist/track'),
	};
}

describe('renderExportBody', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders JSON as stringified buildExportPayload', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-31T12:00:00.000Z'));
		const tracks = [validTrack()];
		expect(renderExportBody('json', tracks)).toBe(
			JSON.stringify(buildExportPayload({ tracks })),
		);
	});

	it('renders CSV as title,artist rows without urls', () => {
		const tracks = [validTrack(), validTrack()];
		const body = renderExportBody('csv', tracks);
		expect(body.startsWith('title,artist\n')).toBe(true);
		expect(body.split('\n')).toHaveLength(tracks.length + 1);
		expect(body).not.toContain('http');
	});

	it('renders Text as Artist - Title lines without urls', () => {
		const tracks = [
			{
				title: 'Around the World',
				artist: 'Daft Punk',
				url: new URL('https://soundcloud.com/daftpunk/around-the-world'),
			},
		];
		expect(renderExportBody('txt', tracks)).toBe(
			'Daft Punk - Around the World\n',
		);
	});

	it('renders M3U as EXTINF bookmarks with page URLs', () => {
		const tracks = [
			{
				title: 'Title One',
				artist: 'Artist One',
				url: new URL('https://soundcloud.com/artist-one/title-one'),
			},
			{
				title: 'Title Two',
				artist: 'Artist Two',
				url: new URL('https://soundcloud.com/artist-two/title-two'),
			},
		];
		expect(renderExportBody('m3u', tracks)).toBe(
			'#EXTM3U\n#EXTINF:-1,Artist One - Title One\nhttps://soundcloud.com/artist-one/title-one\n#EXTINF:-1,Artist Two - Title Two\nhttps://soundcloud.com/artist-two/title-two\n',
		);
	});
});
