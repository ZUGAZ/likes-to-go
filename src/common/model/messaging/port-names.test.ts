import { POPUP_PORT_NAME } from '@/common/model/popup-port-name';
import {
	BACKGROUND_RPC_PORT_NAME,
	CONTENT_RPC_PORT_NAME,
} from '@/common/model/messaging/port-names';
import { describe, expect, it } from 'vitest';

describe('RPC port names', () => {
	it('uses a distinct name for each direction and the legacy popup port', () => {
		expect(BACKGROUND_RPC_PORT_NAME).toBe('likes-to-go/background');
		expect(CONTENT_RPC_PORT_NAME).toBe('likes-to-go/content');
		expect(POPUP_PORT_NAME).toBe('likes-to-go-popup');
		expect(
			new Set([
				BACKGROUND_RPC_PORT_NAME,
				CONTENT_RPC_PORT_NAME,
				POPUP_PORT_NAME,
			]).size,
		).toBe(3);
	});
});
