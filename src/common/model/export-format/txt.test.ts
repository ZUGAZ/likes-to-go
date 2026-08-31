import {
	renderTxtExport,
	txtExportFormat,
} from '@/common/model/export-format/txt';
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

describe('renderTxtExport', () => {
	it('emits an empty body for an empty track list', () => {
		expect(renderTxtExport([])).toBe('');
	});

	it('emits one Artist - Title line ending with a newline', () => {
		expect(
			renderTxtExport([
				validTrack({ artist: 'Daft Punk', title: 'Around the World' }),
			]),
		).toBe('Daft Punk - Around the World\n');
	});

	it('joins tracks with LF and ends with a newline', () => {
		const body = renderTxtExport([
			validTrack({ artist: 'A', title: 'B' }),
			validTrack({ artist: 'C', title: 'D' }),
		]);
		expect(body).toBe('A - B\nC - D\n');
		expect(body.endsWith('\n')).toBe(true);
	});

	it('preserves input order', () => {
		expect(
			renderTxtExport([
				validTrack({ artist: 'First', title: 'One' }),
				validTrack({ artist: 'Second', title: 'Two' }),
				validTrack({ artist: 'Third', title: 'Three' }),
			]),
		).toBe('First - One\nSecond - Two\nThird - Three\n');
	});

	it('collapses CR, LF, and CRLF in artist and title to a single space', () => {
		expect(
			renderTxtExport([
				validTrack({
					artist: 'Art\r\nist\nName\rHere',
					title: 'Ti\r\ntle\nWith\rBreaks',
				}),
			]),
		).toBe('Art ist Name Here - Ti tle With Breaks\n');
	});

	it('leaves a literal space-hyphen-space in fields unchanged', () => {
		expect(
			renderTxtExport([
				validTrack({
					artist: 'A - B',
					title: 'C - D',
				}),
			]),
		).toBe('A - B - C - D\n');
	});

	it('does not export urls or a Sockseek search prefix', () => {
		const body = renderTxtExport([
			validTrack({
				artwork_url: 'https://i1.sndcdn.com/artworks-x.jpg',
				user_url: 'https://soundcloud.com/artist',
			}),
		]);
		expect(body).not.toContain('http');
		expect(body).not.toContain('s:"');
		expect(body).toBe('Artist - Track\n');
	});
});

describe('txtExportFormat', () => {
	it('exposes locked Text metadata', () => {
		expect(txtExportFormat.id).toBe('txt');
		expect(txtExportFormat.label).toBe('Text');
		expect(txtExportFormat.extension).toBe('txt');
		expect(txtExportFormat.worksWith).toBe(
			'Artist then title — Nicotine+, Sockseek, Soundiiz.',
		);
		expect(txtExportFormat.pickerTypes).toEqual([
			{
				description: 'Text',
				accept: { 'text/plain': ['.txt'] },
			},
		]);
	});

	it('renders through the format definition', () => {
		expect(txtExportFormat.render([validTrack()])).toBe('Artist - Track\n');
	});
});
