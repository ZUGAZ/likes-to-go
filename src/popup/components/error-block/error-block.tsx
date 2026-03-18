export interface ErrorBlockProps {
	readonly message: string;
	readonly onRetry: () => void;
}

export function ErrorBlock(props: ErrorBlockProps) {
	return (
		<div class="flex flex-col items-center gap-2">
			<button
				type="button"
				class="rounded bg-rose-500 px-4 py-2 text-white hover:bg-rose-600"
				onClick={() => props.onRetry()}
			>
				❤️ Try again
			</button>

			<p class="text-center text-rose-600 text-sm" role="alert">
				💔 {props.message}
			</p>
		</div>
	);
}
