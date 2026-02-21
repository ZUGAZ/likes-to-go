import { onCleanup, onMount, Show } from "solid-js";
import { createSignal } from "solid-js";

import {
	cancelCollection,
	download,
	startCollection,
	syncStateFromBackground,
} from "@/popup/actions";
import { errorMessage, state, trackCount } from "@/popup/popup-state";

const PROCESSING_HEARTS = ["💛", "🧡"] as const;
const HEART_INTERVAL_MS = 800;

function ProcessingHeart() {
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

export function Popup() {
	onMount(() => {
		void syncStateFromBackground();
	});

	return (
		<div class="min-w-[280px] p-4 font-sans text-sm">
			<Show when={state() === "initial"} fallback={null}>
				<div class="flex flex-col items-center gap-2">
					<button
						type="button"
						class="rounded bg-rose-500 px-4 py-2 text-white hover:bg-rose-600"
						onClick={() => void startCollection()}
					>
						❤️ Likes to go
					</button>
					<p class="text-neutral-600">Waiting for order</p>
				</div>
			</Show>

			<Show when={state() === "processing"} fallback={null}>
				<div class="flex flex-col items-center gap-3">
					<div class="text-2xl">
						<ProcessingHeart />
					</div>
					<p class="text-neutral-700">preparing {trackCount()} tracks…</p>
					<button
						type="button"
						class="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
						onClick={() => void cancelCollection()}
					>
						Cancel order
					</button>
				</div>
			</Show>

			<Show when={state() === "done"} fallback={null}>
				<div class="flex flex-col items-center gap-2">
					<button
						type="button"
						class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
						onClick={() => void download()}
					>
						💚 Ready to go
					</button>
				</div>
			</Show>

			<Show when={state() === "error"} fallback={null}>
				<div class="flex flex-col items-center gap-2">
					<button
						type="button"
						class="rounded bg-rose-500 px-4 py-2 text-white hover:bg-rose-600"
						onClick={() => void startCollection()}
					>
						❤️ Likes to go
					</button>
					<p class="text-neutral-600">Waiting for order</p>
					<p class="text-center text-rose-600" role="alert">
						💔 {errorMessage() ?? "Something went wrong"}
					</p>
				</div>
			</Show>
		</div>
	);
}
