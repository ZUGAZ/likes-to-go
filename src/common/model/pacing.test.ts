import { describe, expect, it } from 'vitest';
import {
	nextDelayMs,
	planNextPace,
	rateCapWaitMs,
} from '@/common/model/pacing';

describe('nextDelayMs', () => {
	it('returns value in 2000–5000 ms with deterministic rng', () => {
		let n = 0;
		const rng = () => (n++ % 100) / 100;
		for (let i = 0; i < 20; i++) {
			const ms = nextDelayMs(rng);
			expect(ms).toBeGreaterThanOrEqual(2000);
			expect(ms).toBeLessThanOrEqual(5000);
		}
	});

	it('returns integer', () => {
		const ms = nextDelayMs(() => 0.5);
		expect(Number.isInteger(ms)).toBe(true);
	});
});

describe('rateCapWaitMs', () => {
	const now = 100_000;

	it('returns 0 when under cap', () => {
		const timestamps = [99_000, 99_500];
		expect(rateCapWaitMs(timestamps, 12, now)).toBe(0);
	});

	it('returns 0 when fewer than max in window', () => {
		const timestamps = [now - 70_000, now - 50_000];
		expect(rateCapWaitMs(timestamps, 12, now)).toBe(0);
	});

	it('returns positive ms when over cap in window', () => {
		const timestamps = Array.from({ length: 12 }, (_, i) => now - i * 5000);
		const wait = rateCapWaitMs(timestamps, 12, now);
		expect(wait).toBeGreaterThan(0);
		expect(wait).toBeLessThanOrEqual(60_000);
	});
});

describe('planNextPace', () => {
	const now = 100_000;

	it('records the current action timestamp and uses the requested delay under cap', () => {
		const plan = planNextPace({
			actionTimestampsMs: [now - 1_000],
			nowMs: now,
			delayMs: 3_000,
			maxPerMinute: 12,
		});

		expect(plan.actionTimestampsMs).toEqual([now - 1_000, now]);
		expect(plan.waitMs).toBe(3_000);
	});

	it('uses the rate cap wait when the updated action window reaches the cap', () => {
		const timestamps = Array.from({ length: 11 }, (_, i) => now - i * 1_000);
		const plan = planNextPace({
			actionTimestampsMs: timestamps,
			nowMs: now,
			delayMs: 3_000,
			maxPerMinute: 12,
		});

		expect(plan.actionTimestampsMs).toHaveLength(12);
		expect(plan.waitMs).toBeGreaterThan(3_000);
	});
});
