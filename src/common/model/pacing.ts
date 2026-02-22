/**
 * Pacing for collection: delay between actions (2–5 s with gaussian jitter)
 * and rate cap (10–15 actions per minute). Content script uses these to avoid bans.
 */

const DELAY_MS_MIN = 2000;
const DELAY_MS_MAX = 5000;
const DELAY_MS_MEAN = (DELAY_MS_MIN + DELAY_MS_MAX) / 2;
const DELAY_MS_STD = 500;
const WINDOW_MS = 60_000;
const DEFAULT_MAX_ACTIONS_PER_MINUTE = 12;

/** Default RNG (browser). Override in tests for determinism. */
function defaultRandom(): number {
	return Math.random();
}

/**
 * Box–Muller transform: two uniform [0,1] -> one normal(0,1).
 * Uses one sample; the second is cached for the next call (module state).
 */
let spare: number | null = null;
function normalSample(rng: () => number): number {
	if (spare !== null) {
		const s = spare;
		spare = null;
		return s;
	}
	const u = rng();
	const v = rng();
	if (u <= 0 || u >= 1) return normalSample(rng);
	const r = Math.sqrt(-2 * Math.log(u));
	spare = r * Math.sin(2 * Math.PI * v);
	return r * Math.cos(2 * Math.PI * v);
}

/**
 * Returns delay in ms for the next collection action (2–5 s with gaussian jitter).
 * Pass a deterministic rng in tests.
 */
export function nextDelayMs(rng: () => number = defaultRandom): number {
	const g = normalSample(rng);
	const ms = DELAY_MS_MEAN + DELAY_MS_STD * g;
	const clamped = Math.max(DELAY_MS_MIN, Math.min(DELAY_MS_MAX, ms));
	return Math.round(clamped);
}

/**
 * Given timestamps (ms) of recent actions, returns extra ms to wait so that
 * we don't exceed maxPerMinute actions in any 60s window.
 * If under cap, returns 0.
 */
export function rateCapWaitMs(
	actionTimestampsMs: readonly number[],
	maxPerMinute: number = DEFAULT_MAX_ACTIONS_PER_MINUTE,
	nowMs: number = Date.now(),
): number {
	const cutoff = nowMs - WINDOW_MS;
	const inWindow = actionTimestampsMs.filter((t) => t >= cutoff);
	if (inWindow.length < maxPerMinute) return 0;
	const sorted = [...inWindow].sort((a, b) => a - b);
	const oldestInWindow = sorted[0] ?? 0;
	const waitUntil = oldestInWindow + WINDOW_MS;
	return Math.max(0, waitUntil - nowMs);
}

/**
 * Promise that resolves after ms. Used by content script for pacing.
 * Placed here so tests can mock or use fake timers.
 */
export function delayMs(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
