import { Effect } from 'effect';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runSendStartToTab } from '@/background/commands/run-send-start-to-tab';

vi.mock('@/common/infrastructure/chrome-messaging', () => ({
	sendToTab: vi.fn().mockResolvedValue(undefined),
}));

describe('runSendStartToTab', () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('succeeds when sendToTab resolves', async () => {
		const exit = await Effect.runPromiseExit(runSendStartToTab(42));

		expect(exit._tag).toBe('Success');
		if (exit._tag === 'Success') {
			expect(exit.value).toBeUndefined();
		}
	});
});
