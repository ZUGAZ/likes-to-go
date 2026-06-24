import {
	forEachInBatches,
	yieldToMain,
} from '@/content/infrastructure/dom-batch';
import { describe, expect, it } from 'vitest';

describe('yieldToMain', () => {
	it('waits for requestAnimationFrame before scheduler.yield', async () => {
		const calls: string[] = [];

		await yieldToMain({
			requestAnimationFrame: (callback) => {
				calls.push('raf');
				callback(0);
				return 1;
			},
			schedulerYield: () => {
				calls.push('scheduler');
				return Promise.resolve();
			},
			setTimeout: (callback) => {
				calls.push('timeout');
				callback();
				return 1;
			},
		});

		expect(calls).toEqual(['raf', 'scheduler']);
	});

	it('falls back to setTimeout when scheduler.yield is unavailable', async () => {
		const calls: string[] = [];

		await yieldToMain({
			requestAnimationFrame: (callback) => {
				calls.push('raf');
				callback(0);
				return 1;
			},
			setTimeout: (callback) => {
				calls.push('timeout');
				callback();
				return 1;
			},
		});

		expect(calls).toEqual(['raf', 'timeout']);
	});
});

describe('forEachInBatches', () => {
	it('applies each item and yields between batches', async () => {
		const seen: number[] = [];
		const yieldCalls: string[] = [];

		await forEachInBatches(
			[1, 2, 3, 4, 5],
			(item) => {
				seen.push(item);
			},
			{
				batchSize: 2,
				yieldToMain: () => {
					yieldCalls.push('yield');
					return Promise.resolve();
				},
			},
		);

		expect(seen).toEqual([1, 2, 3, 4, 5]);
		expect(yieldCalls).toHaveLength(2);
	});
});
