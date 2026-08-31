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
	it('decodes json and rejects unknown format ids', () => {
		expect(
			Either.isRight(Schema.decodeUnknownEither(ExportFormatIdSchema)('json')),
		).toBe(true);
		expect(
			Either.isLeft(Schema.decodeUnknownEither(ExportFormatIdSchema)('csv')),
		).toBe(true);
		expect(
			Either.isLeft(Schema.decodeUnknownEither(ExportFormatIdSchema)('')),
		).toBe(true);
	});

	it('resolves a missing format to json', () => {
		expect(resolveExportFormatId({})).toBe('json');
		expect(resolveExportFormatId({ format: 'json' })).toBe('json');
	});

	it('defaults to json and lists the JSON format', () => {
		expect(defaultExportFormatId()).toBe('json');
		const formats = listExportFormats();
		expect(formats).toHaveLength(1);
		expect(formats[0]?.id).toBe('json');
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

	it('fails for an unknown format id', () => {
		expect(() => getExportFormat('csv')).toThrow(ExportFormatNotFound);
	});
});
