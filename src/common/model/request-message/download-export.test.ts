import { parseRequestMessage } from '@/common/infrastructure/parse-request-message';
import {
	DownloadExportRequest,
	DownloadExportSchema,
	isDownloadExport,
	StartCollectionRequest,
} from '@/common/model/request-message';
import { Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';

describe('DownloadExport', () => {
	describe('DownloadExportRequest constructor + isDownloadExport guard', () => {
		it('constructor with no format produces a value that satisfies the guard', () => {
			expect(isDownloadExport(DownloadExportRequest())).toBe(true);
		});

		it('constructor with json format produces a value that satisfies the guard', () => {
			expect(isDownloadExport(DownloadExportRequest({ format: 'json' }))).toBe(
				true,
			);
		});

		it('constructor with csv format produces a value that satisfies the guard', () => {
			expect(isDownloadExport(DownloadExportRequest({ format: 'csv' }))).toBe(
				true,
			);
		});

		it('rejects a different request tag', () => {
			expect(isDownloadExport(StartCollectionRequest())).toBe(false);
		});
	});

	describe('schema decode', () => {
		it('decodes a payload without format', () => {
			const result = Schema.decodeUnknownEither(DownloadExportSchema)({
				_tag: 'DownloadExport',
			});
			expect(Either.isRight(result)).toBe(true);
		});

		it('decodes a payload with format json', () => {
			const result = Schema.decodeUnknownEither(DownloadExportSchema)({
				_tag: 'DownloadExport',
				format: 'json',
			});
			expect(Either.isRight(result)).toBe(true);
			if (Either.isLeft(result)) {
				throw new Error('Expected Right');
			}
			expect(result.right.format).toBe('json');
		});

		it('decodes a payload with format csv', () => {
			const result = Schema.decodeUnknownEither(DownloadExportSchema)({
				_tag: 'DownloadExport',
				format: 'csv',
			});
			expect(Either.isRight(result)).toBe(true);
			if (Either.isLeft(result)) {
				throw new Error('Expected Right');
			}
			expect(result.right.format).toBe('csv');
		});

		it('rejects an unknown format id', () => {
			const result = Schema.decodeUnknownEither(DownloadExportSchema)({
				_tag: 'DownloadExport',
				format: 'xlsx',
			});
			expect(Either.isLeft(result)).toBe(true);
		});
	});

	describe('parseRequestMessage', () => {
		it('returns Right for DownloadExport without format', () => {
			const result = parseRequestMessage({ _tag: 'DownloadExport' });
			expect(Either.isRight(result)).toBe(true);
		});

		it('returns Right for DownloadExport with format json', () => {
			const result = parseRequestMessage({
				_tag: 'DownloadExport',
				format: 'json',
			});
			expect(Either.isRight(result)).toBe(true);
		});

		it('returns Right for DownloadExport with format csv', () => {
			const result = parseRequestMessage({
				_tag: 'DownloadExport',
				format: 'csv',
			});
			expect(Either.isRight(result)).toBe(true);
		});

		it('returns Left for DownloadExport with an unknown format', () => {
			const result = parseRequestMessage({
				_tag: 'DownloadExport',
				format: 'xlsx',
			});
			expect(Either.isLeft(result)).toBe(true);
		});
	});
});
