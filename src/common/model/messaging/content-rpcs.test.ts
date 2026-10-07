import { RpcSchema } from '@effect/rpc';
import { Schema } from 'effect';
import { describe, expect, it } from 'vitest';

import {
	CancelPageCollection,
	ContentRpcs,
	ShowMascot,
	StartPageCollection,
	ToggleMascot,
} from '@/common/model/messaging/content-rpcs';

const contentRpcTags = [
	'StartPageCollection',
	'CancelPageCollection',
	'ToggleMascot',
	'ShowMascot',
];

const contentRpcs = [
	StartPageCollection,
	CancelPageCollection,
	ToggleMascot,
	ShowMascot,
];

describe('ContentRpcs', () => {
	it('lists exactly the content procedures', () => {
		expect([...ContentRpcs.requests.keys()].sort()).toEqual(
			[...contentRpcTags].sort(),
		);
	});

	it('is a void command with no middleware and no stream', () => {
		for (const rpc of contentRpcs) {
			expect(rpc.payloadSchema).toBe(Schema.Void);
			expect(rpc.successSchema).toBe(Schema.Void);
			expect(rpc.errorSchema).toBe(Schema.Never);
			expect(RpcSchema.isStreamSchema(rpc.successSchema)).toBe(false);
			expect(rpc.middlewares.size).toBe(0);
		}
	});
});
