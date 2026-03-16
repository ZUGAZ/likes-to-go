import { Show, type Accessor } from 'solid-js';

import type { PopupState } from '@/popup/components/popup/model';
import { ProcessingHeart } from '@/popup/components/processing-heart/processing-heart';

interface PopupViewProps {
	state: Accessor<PopupState>;
	trackCount: Accessor<number>;
	errorMessage: Accessor<string | undefined>;
	onStart: () => void;
	onCancel: () => void;
	onDownload: () => void;
}

export function PopupView(props: PopupViewProps) {
	return (
		<div class="min-w-[280px] p-4 font-sans text-sm">
			<Show when={props.state() === 'initial'} fallback={null}>
				<div class="flex flex-col items-center gap-2">
					<button
						type="button"
						class="rounded bg-rose-500 px-4 py-2 text-white hover:bg-rose-600"
						onClick={props.onStart}
					>
						❤️ Likes to go
					</button>
					<p class="text-neutral-600">Waiting for order</p>
				</div>
			</Show>

			<Show when={props.state() === 'processing'} fallback={null}>
				<div class="flex flex-col items-center gap-3">
					<div class="text-2xl">
						<ProcessingHeart />
					</div>
					<p class="text-neutral-700">
						preparing {props.trackCount()} tracks…
					</p>
					<button
						type="button"
						class="rounded border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
						onClick={props.onCancel}
					>
						Cancel order
					</button>
				</div>
			</Show>

			<Show when={props.state() === 'done'} fallback={null}>
				<div class="flex flex-col items-center gap-2">
					<button
						type="button"
						class="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
						onClick={props.onDownload}
					>
						💚 Ready to go
					</button>
				</div>
			</Show>

			<Show when={props.state() === 'error'} fallback={null}>
				<div class="flex flex-col items-center gap-2">
					<button
						type="button"
						class="rounded bg-rose-500 px-4 py-2 text-white hover:bg-rose-600"
						onClick={props.onStart}
					>
						❤️ Likes to go
					</button>
					<p class="text-neutral-600">Waiting for order</p>
					<p class="text-center text-rose-600" role="alert">
						💔 {props.errorMessage() ?? 'Something went wrong'}
					</p>
				</div>
			</Show>
		</div>
	);
}

