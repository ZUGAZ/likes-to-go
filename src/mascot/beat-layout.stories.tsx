import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Mascot } from '@/mascot/mascot';
import { resolveBundledPoseUrl } from '@/mascot/pose-assets';
import { SpeechBalloon } from '@/mascot/speech-balloon';

type BeatLayoutStoryArgs = {
	theme: 'light' | 'dark';
	presentation: 'popup' | 'overlay';
	isAnimating: boolean;
};

function BeatLayoutStoryHost(props: BeatLayoutStoryArgs) {
	const rootClass =
		props.presentation === 'overlay'
			? 'beat-root w-[640px] max-w-[calc(100vw-2rem)] bg-transparent font-sans text-sm'
			: 'beat-root w-[640px] bg-white p-4 font-sans text-neutral-900 text-sm dark:bg-neutral-950 dark:text-neutral-100';

	return (
		<div
			data-theme={props.theme}
			style={{ 'color-scheme': props.theme }}
			class={
				props.presentation === 'overlay'
					? 'flex min-h-[420px] w-[min(100vw,720px)] items-center justify-center bg-neutral-700 p-8'
					: undefined
			}
		>
			<main class={rootClass}>
				<div class="beat-layout">
					<Mascot
						poseUrl={resolveBundledPoseUrl('idle')}
						isAnimating={props.isAnimating}
						alt="Beat idle pose"
					/>
					<SpeechBalloon
						copy="Hey! Ready to back up your SoundCloud likes?"
						options={[
							{ label: 'Start export', actionId: 'start' },
						]}
						footnoteCopy={undefined}
						onAction={() => undefined}
						onDismiss={undefined}
					/>
				</div>
			</main>
		</div>
	);
}

const meta = {
	title: 'Mascot/BeatLayout',
	component: BeatLayoutStoryHost,
	args: {
		theme: 'light',
		presentation: 'popup',
		isAnimating: false,
	} satisfies BeatLayoutStoryArgs,
	argTypes: {
		theme: {
			control: 'select',
			options: ['light', 'dark'],
		},
		presentation: {
			control: 'select',
			options: ['popup', 'overlay'],
		},
		isAnimating: { control: 'boolean' },
	},
} satisfies Meta<typeof BeatLayoutStoryHost>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Popup: Story = {};

export const Overlay: Story = {
	args: {
		presentation: 'overlay',
	},
};

export const Dark: Story = {
	args: {
		theme: 'dark',
	},
};

export const Animating: Story = {
	args: {
		isAnimating: true,
	},
};
