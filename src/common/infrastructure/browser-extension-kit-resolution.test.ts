import { describe, expect, it } from 'vitest';
import { defaultRequestTimeout } from 'browser-extension-kit/messaging';
import { makeFakePortHub } from 'browser-extension-kit/testing';

describe('browser-extension-kit resolution', () => {
	it('resolves the messaging subpath from source', () => {
		expect(defaultRequestTimeout).toBeDefined();
	});

	it('resolves the testing subpath from source', () => {
		expect(makeFakePortHub).toBeDefined();
	});
});
