import { escapeCsvField } from '@/common/model/export-format/escape-csv-field';
import { describe, expect, it } from 'vitest';

describe('escapeCsvField', () => {
	it('leaves a plain field unquoted', () => {
		expect(escapeCsvField('Plain')).toBe('Plain');
	});

	it('leaves an empty field unquoted', () => {
		expect(escapeCsvField('')).toBe('');
	});

	it('quotes a field that contains a comma', () => {
		expect(escapeCsvField('a,b')).toBe('"a,b"');
	});

	it('quotes a field and doubles embedded quotes', () => {
		expect(escapeCsvField('Say "Hi"')).toBe('"Say ""Hi"""');
	});

	it('quotes a field and preserves a line feed', () => {
		expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
	});

	it('quotes a field that contains a carriage return', () => {
		expect(escapeCsvField('a\rb')).toBe('"a\rb"');
	});
});
