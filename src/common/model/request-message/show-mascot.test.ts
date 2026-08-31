import { parseRequestMessage } from '@/common/infrastructure/parse-request-message';
import {
	StartCollectionRequest,
	isShowMascot,
	ShowMascotRequest,
	ShowMascotSchema,
} from '@/common/model/request-message';
import { Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';

describe('ShowMascot', () => {
	describe('ShowMascotRequest constructor + isShowMascot guard', () => {
		it('constructor produces a value that satisfies the guard', () => {
			expect(isShowMascot(ShowMascotRequest())).toBe(true);
		});

		it('rejects a different request tag', () => {
			expect(isShowMascot(StartCollectionRequest())).toBe(false);
		});

		it('rejects an unrelated object', () => {
			expect(isShowMascot({ _tag: 'Unknown' })).toBe(false);
		});
	});

	describe('schema decode', () => {
		it('decodes a plain object with the correct tag', () => {
			const result = Schema.decodeUnknownEither(ShowMascotSchema)({
				_tag: 'ShowMascot',
			});
			expect(Either.isRight(result)).toBe(true);
		});

		it('fails to decode an object with a wrong tag', () => {
			const result = Schema.decodeUnknownEither(ShowMascotSchema)({
				_tag: 'StartCollection',
			});
			expect(Either.isLeft(result)).toBe(true);
		});

		it('fails to decode when _tag is missing', () => {
			const result = Schema.decodeUnknownEither(ShowMascotSchema)({});
			expect(Either.isLeft(result)).toBe(true);
		});
	});

	describe('parseRequestMessage', () => {
		it('returns Right for a ShowMascot payload', () => {
			const result = parseRequestMessage({ _tag: 'ShowMascot' });
			expect(Either.isRight(result)).toBe(true);
		});

		it('decoded value satisfies isShowMascot', () => {
			const result = parseRequestMessage({ _tag: 'ShowMascot' });
			if (Either.isLeft(result)) throw new Error('Expected Right');
			expect(isShowMascot(result.right)).toBe(true);
		});
	});
});
