import type { JSX } from 'solid-js';

interface PopupStatusProps {
	readonly busy: boolean;
	readonly liveMessage: string | undefined;
	readonly children: JSX.Element;
}

export function PopupStatus(props: PopupStatusProps) {
	return (
		<section aria-busy={props.busy ? 'true' : undefined}>
			<p aria-atomic="true" aria-live="polite" class="sr-only">
				{props.liveMessage ?? ''}
			</p>
			{props.children}
		</section>
	);
}
