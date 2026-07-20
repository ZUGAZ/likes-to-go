import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import type { BeatActionId, BeatPersonaOption } from '@/mascot/persona';
import { SpeechBalloon } from '@/mascot/speech-balloon';

const logAction = (actionId: BeatActionId): void => {
	console.info('[SpeechBalloon story] action', actionId);
};

const logDismiss = (): void => {
	console.info('[SpeechBalloon story] dismiss');
};

const startOption: BeatPersonaOption = {
	label: 'Start export',
	actionId: 'start',
};

const retryOption: BeatPersonaOption = {
	label: 'Try again',
	actionId: 'retry',
};

const downloadOption: BeatPersonaOption = {
	label: 'Download JSON',
	actionId: 'download',
};

type SpeechBalloonStoryArgs = {
	copy: string;
	theme: 'light' | 'dark';
	isError: boolean;
	showActions: boolean;
	showFootnote: boolean;
	showDismiss: boolean;
};

function SpeechBalloonStoryHost(props: SpeechBalloonStoryArgs) {
	const options = (): ReadonlyArray<BeatPersonaOption> =>
		props.showActions ? [startOption, retryOption, downloadOption] : [];

	return (
		<div data-theme={props.theme} style={{ 'color-scheme': props.theme }}>
			<div class="w-[min(100vw,22rem)] bg-white p-4 dark:bg-neutral-950">
				<SpeechBalloon
					copy={props.copy}
					options={options()}
					footnoteCopy={
						props.showFootnote
							? '3 tracks were skipped because metadata was missing.'
							: undefined
					}
					isError={props.isError}
					onAction={logAction}
					onDismiss={props.showDismiss ? logDismiss : undefined}
				/>
			</div>
		</div>
	);
}

const meta = {
	title: 'Mascot/SpeechBalloon',
	component: SpeechBalloonStoryHost,
	args: {
		copy: 'Hey! Ready to back up your SoundCloud likes?',
		theme: 'light',
		isError: false,
		showActions: true,
		showFootnote: false,
		showDismiss: false,
	} satisfies SpeechBalloonStoryArgs,
	argTypes: {
		theme: {
			control: 'select',
			options: ['light', 'dark'],
		},
		copy: { control: 'text' },
		isError: { control: 'boolean' },
		showActions: { control: 'boolean' },
		showFootnote: { control: 'boolean' },
		showDismiss: { control: 'boolean' },
	},
} satisfies Meta<typeof SpeechBalloonStoryHost>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongCopy: Story = {
	args: {
		copy: 'I am still paging through your likes. Hang tight — this can take a minute if your library is huge.',
		showActions: false,
	},
};

export const WithFootnote: Story = {
	args: {
		showFootnote: true,
	},
};

export const ErrorAlert: Story = {
	args: {
		copy: 'Network blip. Want me to try again?',
		isError: true,
		showActions: true,
	},
};

export const WithDismiss: Story = {
	args: {
		showDismiss: true,
		showActions: false,
	},
};

export const Dark: Story = {
	args: {
		theme: 'dark',
	},
};
