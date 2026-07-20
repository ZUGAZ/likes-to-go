import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { For } from 'solid-js';

import { Mascot } from '@/mascot/mascot';
import { resolveBundledPoseUrl } from '@/mascot/pose-assets';
import type { BeatPoseKey } from '@/mascot/persona';

const POSES: ReadonlyArray<BeatPoseKey> = ['idle', 'working', 'happy', 'sad'];

type MascotStoryArgs = {
	pose: BeatPoseKey;
	isAnimating: boolean;
	theme: 'light' | 'dark';
};

function MascotStoryHost(props: MascotStoryArgs) {
	return (
		<div
			data-theme={props.theme}
			style={{ 'color-scheme': props.theme }}
			class="bg-white p-6 dark:bg-neutral-950"
		>
			<Mascot
				poseUrl={resolveBundledPoseUrl(props.pose)}
				isAnimating={props.isAnimating}
				alt={`Beat ${props.pose} pose`}
			/>
		</div>
	);
}

const meta = {
	title: 'Mascot/Mascot',
	component: MascotStoryHost,
	args: {
		pose: 'idle',
		isAnimating: false,
		theme: 'light',
	} satisfies MascotStoryArgs,
	argTypes: {
		pose: {
			control: 'select',
			options: [...POSES],
		},
		isAnimating: { control: 'boolean' },
		theme: {
			control: 'select',
			options: ['light', 'dark'],
		},
	},
} satisfies Meta<typeof MascotStoryHost>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
	args: { pose: 'idle' },
};

export const Working: Story = {
	args: { pose: 'working', isAnimating: true },
};

export const Happy: Story = {
	args: { pose: 'happy' },
};

export const Sad: Story = {
	args: { pose: 'sad' },
};

export const Dark: Story = {
	args: { pose: 'idle', theme: 'dark' },
};

export const AllPoses: Story = {
	render: () => (
		<div class="grid grid-cols-2 gap-6 bg-white p-6 dark:bg-neutral-950">
			<For each={POSES}>
				{(pose) => (
					<div class="flex flex-col items-center gap-2">
						<Mascot
							poseUrl={resolveBundledPoseUrl(pose)}
							isAnimating={pose === 'working'}
							alt={`Beat ${pose} pose`}
						/>
						<span class="text-xs text-neutral-500">{pose}</span>
					</div>
				)}
			</For>
		</div>
	),
};
