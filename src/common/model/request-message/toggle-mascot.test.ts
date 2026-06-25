import { parseRequestMessage } from '@/common/infrastructure/parse-request-message';
import {
	StartCollectionRequest,
	isToggleMascot,
	ToggleMascotRequest,
	ToggleMascotSchema,
} from '@/common/model/request-message';
import { Either, Schema } from 'effect';
import { describe, expect, it } from 'vitest';

describe('ToggleMascot', () => {
	describe('ToggleMascotRequest constructor + isToggleMascot guard', () => {
		it('constructor produces a value that satisfies the guard', () => {
			expect(isToggleMascot(ToggleMascotRequest())).toBe(true);
		});

		it('rejects a different request tag', () => {
			expect(isToggleMascot(StartCollectionRequest())).toBe(false);
		});

		it('rejects an unrelated object', () => {
			expect(isToggleMascot({ _tag: 'Unknown' })).toBe(false);
		});
	});

	describe('schema decode', () => {
		it('decodes a plain object with the correct tag', () => {
			const result = Schema.decodeUnknownEither(ToggleMascotSchema)({
				_tag: 'ToggleMascot',
			});
			expect(Either.isRight(result)).toBe(true);
		});

		it('fails to decode an object with a wrong tag', () => {
			const result = Schema.decodeUnknownEither(ToggleMascotSchema)({
				_tag: 'StartCollection',
			});
			expect(Either.isLeft(result)).toBe(true);
		});

		it('fails to decode when _tag is missing', () => {
			const result = Schema.decodeUnknownEither(ToggleMascotSchema)({});
			expect(Either.isLeft(result)).toBe(true);
		});
	});

	describe('parseRequestMessage', () => {
		it('returns Right for a ToggleMascot payload', () => {
			const result = parseRequestMessage({ _tag: 'ToggleMascot' });
			expect(Either.isRight(result)).toBe(true);
		});

		it('decoded value satisfies isToggleMascot', () => {
			const result = parseRequestMessage({ _tag: 'ToggleMascot' });
			if (Either.isLeft(result)) throw new Error('Expected Right');
			expect(isToggleMascot(result.right)).toBe(true);
		});

		it('returns Left for an unknown tag', () => {
			const result = parseRequestMessage({ _tag: 'NotARealMessage' });
			expect(Either.isLeft(result)).toBe(true);
		});
	});
});
