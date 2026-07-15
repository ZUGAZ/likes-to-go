import { For, Show } from 'solid-js';

import type { BeatActionId, BeatPersonaOption } from '@/mascot/persona';

interface SpeechBalloonProps {
	readonly copy: string;
	readonly options: ReadonlyArray<BeatPersonaOption>;
	readonly footnoteCopy: string | undefined;
	readonly isError?: boolean;
	readonly onAction: (actionId: BeatActionId) => void;
	readonly onDismiss: (() => void) | undefined;
}

export function SpeechBalloon(props: SpeechBalloonProps) {
	return (
		<div class="beat-balloon">
			<div class="beat-balloon__panel">
				<svg class="beat-balloon__tail" viewBox="0 0 36 52" aria-hidden="true">
					<path d="M34 3 C34 3 38 26 6 50 C22 38 28 16 34 3 Z" />
				</svg>
				<div class="beat-balloon__body flex flex-col gap-2 rounded-2xl bg-white p-3 text-sm shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-700">
					<p
						class="text-neutral-800 dark:text-neutral-200"
						role={props.isError === true ? 'alert' : undefined}
					>
						{props.copy}
					</p>

					<Show when={props.options.length > 0}>
						<div class="flex flex-wrap gap-2">
							<For each={props.options}>
								{(option) => (
									<button
										type="button"
										class="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs text-white hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:bg-white dark:focus-visible:ring-neutral-100 dark:focus-visible:ring-offset-neutral-900"
										onClick={() => props.onAction(option.actionId)}
									>
										{option.label}
									</button>
								)}
							</For>
						</div>
					</Show>

					<Show when={props.footnoteCopy !== undefined}>
						<p
							class="text-xs text-neutral-500 dark:text-neutral-400"
							role="status"
						>
							{props.footnoteCopy}
						</p>
					</Show>

					<Show when={props.onDismiss !== undefined}>
						<button
							type="button"
							class="self-end text-xs text-neutral-400 hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-1 dark:text-neutral-500 dark:hover:text-neutral-300"
							onClick={() => props.onDismiss?.()}
						>
							Dismiss
						</button>
					</Show>
				</div>
			</div>
		</div>
	);
}
