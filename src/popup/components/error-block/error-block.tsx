export interface ErrorBlockProps {
	readonly message: string;
	readonly onRetry: () => void;
	readonly variant?: 'login-required' | 'generic';
}

export function ErrorBlock(props: ErrorBlockProps) {
	return (
		<div class="flex flex-col items-center gap-2">
			<p class="wrap-break-word text-center text-rose-600 text-sm" role="alert">
				<span aria-hidden="true">
					{props.variant === 'login-required' ? '🔐 ' : '💔 '}
				</span>
				{props.message}
			</p>

			<button
				type="button"
				class="rounded bg-rose-500 px-4 py-2 text-white hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
				onClick={() => props.onRetry()}
			>
				{props.variant === 'login-required' ? 'Try again' : '❤️ Try again'}
			</button>
		</div>
	);
}
