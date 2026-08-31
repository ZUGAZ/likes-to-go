import {
	csvExportFormat,
	renderCsvExport,
} from '@/common/model/export-format/csv';
import { escapeCsvField } from '@/common/model/export-format/escape-csv-field';
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

function parseCsvRecord(record: string): readonly string[] {
	const fields: string[] = [];
	let current = '';
	let inQuotes = false;
	for (let index = 0; index < record.length; index += 1) {
		const char = record[index];
		if (char === undefined) {
			break;
		}
		if (inQuotes) {
			if (char === '"') {
				const next = record[index + 1];
				if (next === '"') {
					current += '"';
					index += 1;
				} else {
					inQuotes = false;
				}
			} else {
				current += char;
			}
			continue;
		}
		if (char === '"') {
			inQuotes = true;
			continue;
		}
		if (char === ',') {
			fields.push(current);
			current = '';
			continue;
		}
		current += char;
	}
	fields.push(current);
	return fields;
}

describe('renderCsvExport', () => {
	it('emits a header-only body for an empty track list', () => {
		expect(renderCsvExport([])).toBe('title,artist');
	});

	it('emits a header and one title,artist row', () => {
		expect(renderCsvExport([validTrack()])).toBe('title,artist\nTrack,Artist');
	});

	it('emits an empty artist as a trailing comma', () => {
		expect(renderCsvExport([validTrack({ artist: '' })])).toBe(
			'title,artist\nTrack,',
		);
	});

	it('does not export urls or optional artwork and user fields', () => {
		const body = renderCsvExport([
			validTrack({
				artwork_url: 'https://i1.sndcdn.com/artworks-x.jpg',
				user_url: 'https://soundcloud.com/artist',
			}),
		]);
		expect(body).not.toContain('http');
		expect(body).toBe('title,artist\nTrack,Artist');
	});

	it('joins rows with LF and does not trail a newline after the last row', () => {
		const body = renderCsvExport([
			validTrack({ title: 'A', artist: 'B' }),
			validTrack({ title: 'C', artist: 'D' }),
		]);
		expect(body).toBe('title,artist\nA,B\nC,D');
		expect(body.endsWith('\n')).toBe(false);
	});

	it('round-trips arbitrary title and artist as two logical fields', () => {
		fc.assert(
			fc.property(fc.string(), fc.string(), (title, artist) => {
				const fields = parseCsvRecord(
					`${escapeCsvField(title)},${escapeCsvField(artist)}`,
				);
				expect(fields).toEqual([title, artist]);
			}),
		);
	});
});

describe('csvExportFormat', () => {
	it('renders through the format definition', () => {
		expect(csvExportFormat.render([validTrack()])).toBe(
			'title,artist\nTrack,Artist',
		);
	});
});
