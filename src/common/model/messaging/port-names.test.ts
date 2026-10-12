import {
	BACKGROUND_RPC_PORT_NAME,
	CONTENT_RPC_PORT_NAME,
} from '@/common/model/messaging/port-names';
import { describe, expect, it } from 'vitest';

describe('RPC port names', () => {
	it('uses a distinct name for each direction', () => {
		expect(BACKGROUND_RPC_PORT_NAME).toBe('likes-to-go/background');
		expect(CONTENT_RPC_PORT_NAME).toBe('likes-to-go/content');
		expect(
			new Set([BACKGROUND_RPC_PORT_NAME, CONTENT_RPC_PORT_NAME]).size,
		).toBe(2);
	});
});
