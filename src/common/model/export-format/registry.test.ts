import {
	ExportFormatIdSchema,
	resolveExportFormatId,
} from '@/common/model/export-format/export-format-id';
import {
	defaultExportFormatId,
	ExportFormatNotFound,
	getExportFormat,
	listExportFormats,
} from '@/common/model/export-format/registry';
import { Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';

describe('export format registry', () => {
	it('decodes json and csv and rejects unknown format ids', () => {
		expect(
			Either.isRight(Schema.decodeUnknownEither(ExportFormatIdSchema)('json')),
		).toBe(true);
		expect(
			Either.isRight(Schema.decodeUnknownEither(ExportFormatIdSchema)('csv')),
		).toBe(true);
		expect(
			Either.isLeft(Schema.decodeUnknownEither(ExportFormatIdSchema)('')),
		).toBe(true);
		expect(
			Either.isLeft(Schema.decodeUnknownEither(ExportFormatIdSchema)('xlsx')),
		).toBe(true);
	});

	it('resolves a missing format to json', () => {
		expect(resolveExportFormatId({})).toBe('json');
		expect(resolveExportFormatId({ format: 'json' })).toBe('json');
		expect(resolveExportFormatId({ format: 'csv' })).toBe('csv');
	});

	it('defaults to json and lists JSON then CSV', () => {
		expect(defaultExportFormatId()).toBe('json');
		expect(listExportFormats().map((format) => format.id)).toEqual([
			'json',
			'csv',
		]);
	});

	it('returns locked JSON metadata', () => {
		const format = getExportFormat('json');
		expect(format.id).toBe('json');
		expect(format.label).toBe('JSON');
		expect(format.extension).toBe('json');
		expect(format.worksWith).toBe(
			'Your full backup — keep it, or drop it in a chat.',
		);
		expect(format.pickerTypes).toEqual([
			{
				description: 'JSON backup',
				accept: { 'application/json': ['.json'] },
			},
		]);
	});

	it('returns locked CSV metadata', () => {
		const format = getExportFormat('csv');
		expect(format.id).toBe('csv');
		expect(format.label).toBe('CSV');
		expect(format.extension).toBe('csv');
		expect(format.worksWith).toBe(
			'Title and artist — Soundiiz, Sockseek, TuneMyMusic.',
		);
		expect(format.pickerTypes).toEqual([
			{
				description: 'CSV export',
				accept: { 'text/csv': ['.csv'] },
			},
		]);
	});

	it('fails for an unknown format id', () => {
		expect(() => getExportFormat('xlsx')).toThrow(ExportFormatNotFound);
	});
});
