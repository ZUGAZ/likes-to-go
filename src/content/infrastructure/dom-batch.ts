declare global {
	interface Window {
		readonly scheduler?: {
			readonly yield?: () => Promise<void>;
		};
	}
}

const DEFAULT_BATCH_SIZE = 20;

export interface YieldToMainDependencies {
	readonly requestAnimationFrame: (callback: FrameRequestCallback) => number;
	readonly schedulerYield?: () => Promise<void>;
	readonly setTimeout: (callback: () => void, delayMs: number) => unknown;
}

export interface BatchOptions {
	readonly batchSize?: number;
	readonly yieldToMain?: () => Promise<void>;
}

function defaultSchedulerYield(): (() => Promise<void>) | undefined {
	const schedulerYield = window.scheduler?.yield;
	if (schedulerYield === undefined) return undefined;

	return () => schedulerYield();
}

function defaultYieldToMainDependencies(): YieldToMainDependencies {
	const schedulerYield = defaultSchedulerYield();
	const dependencies = {
		requestAnimationFrame: globalThis.requestAnimationFrame.bind(globalThis),
		setTimeout: globalThis.setTimeout.bind(globalThis),
	};

	if (schedulerYield === undefined) return dependencies;

	return {
		...dependencies,
		schedulerYield,
	};
}

function timeoutYield(
	setTimeoutFn: YieldToMainDependencies['setTimeout'],
): Promise<void> {
	return new Promise((resolve) => {
		setTimeoutFn(resolve, 0);
	});
}

function animationFrameYield(
	requestAnimationFrame: YieldToMainDependencies['requestAnimationFrame'],
): Promise<void> {
	return new Promise((resolve) => {
		requestAnimationFrame(() => resolve());
	});
}

export async function yieldToMain(
	dependencies: YieldToMainDependencies = defaultYieldToMainDependencies(),
): Promise<void> {
	await animationFrameYield(dependencies.requestAnimationFrame);

	if (dependencies.schedulerYield !== undefined) {
		await dependencies.schedulerYield();
		return;
	}

	await timeoutYield(dependencies.setTimeout);
}

export async function forEachInBatches<T>(
	items: readonly T[],
	fn: (item: T) => void,
	options: BatchOptions = {},
): Promise<void> {
	const batchSize = Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE);
	const yieldFn = options.yieldToMain ?? yieldToMain;

	for (let start = 0; start < items.length; start += batchSize) {
		const batch = items.slice(start, start + batchSize);
		batch.forEach(fn);

		if (start + batchSize < items.length) {
			await yieldFn();
		}
	}
}
