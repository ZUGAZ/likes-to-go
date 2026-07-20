import { For, Show } from 'solid-js';

import type { BeatActionId, BeatPersonaOption } from '@/mascot/persona';

export interface SpeechBalloonProps {
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
			<p
				class="beat-balloon__copy"
				role={props.isError === true ? 'alert' : undefined}
			>
				{props.copy}
			</p>

			<Show when={props.options.length > 0}>
				<div class="beat-balloon__actions">
					<For each={props.options}>
						{(option) => (
							<button
								type="button"
								class="beat-balloon__action"
								onClick={() => props.onAction(option.actionId)}
							>
								{option.label}
							</button>
						)}
					</For>
				</div>
			</Show>

			<Show when={props.footnoteCopy !== undefined}>
				<p class="beat-balloon__footnote" role="status">
					{props.footnoteCopy}
				</p>
			</Show>

			<Show when={props.onDismiss !== undefined}>
				<button
					type="button"
					class="beat-balloon__dismiss"
					onClick={() => props.onDismiss?.()}
				>
					Dismiss
				</button>
			</Show>
		</div>
	);
}
