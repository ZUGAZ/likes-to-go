import { createSignal, onCleanup, onMount } from 'solid-js';

const PROCESSING_HEARTS = ['💛', '🧡'] as const;
const HEART_INTERVAL_MS = 800;

export function ProcessingHeart() {
	const [index, setIndex] = createSignal(0);
	let intervalId: ReturnType<typeof setInterval> | undefined;

	onMount(() => {
		intervalId = setInterval(() => {
			setIndex((i) => (i + 1) % PROCESSING_HEARTS.length);
		}, HEART_INTERVAL_MS);
	});

	onCleanup(() => {
		if (intervalId !== undefined) clearInterval(intervalId);
	});

	return <span aria-hidden="true">{PROCESSING_HEARTS[index()]}</span>;
}

