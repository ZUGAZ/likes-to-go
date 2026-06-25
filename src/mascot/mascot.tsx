interface MascotProps {
	readonly poseUrl: string;
	readonly isAnimating: boolean;
	readonly alt?: string;
}

export function Mascot(props: MascotProps) {
	return (
		<div class="beat-mascot">
			<img
				src={props.poseUrl}
				alt={props.alt ?? ''}
				class={props.isAnimating ? 'heartbeat' : undefined}
				aria-hidden={props.alt === undefined ? 'true' : undefined}
			/>
		</div>
	);
}
