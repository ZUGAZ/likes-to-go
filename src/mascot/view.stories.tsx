import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import {
    BeatViewStoryHost,
    type BeatViewStoryArgs,
} from '@/mascot/beat-view-story-host';
import type { BeatState } from '@/mascot/model';

const BEAT_STATES: ReadonlyArray<BeatState> = [
	'initializing',
	'initial',
	'loading',
	'checking-login',
	'processing',
	'paused',
	'done',
	'login-required',
	'error',
];

const meta = {
	title: 'Mascot/BeatView',
	component: BeatViewStoryHost,
	args: {
		state: 'initial',
		theme: 'light',
		presentation: 'popup',
		trackCount: 0,
		skippedTrackCount: 0,
		message: undefined,
		source: 'likes-page',
		showDismiss: false,
	} satisfies BeatViewStoryArgs,
	argTypes: {
		state: {
			control: 'select',
			options: [...BEAT_STATES],
		},
		theme: {
			control: 'select',
			options: ['light', 'dark'],
		},
		presentation: {
			control: 'select',
			options: ['popup', 'overlay'],
		},
		trackCount: { control: 'number' },
		skippedTrackCount: { control: 'number' },
		message: { control: 'text' },
		source: {
			control: 'select',
			options: ['likes-page', 'active-soundcloud-tab'],
		},
		showDismiss: { control: 'boolean' },
	},
} satisfies Meta<typeof BeatViewStoryHost>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initializing: Story = {
	name: 'initializing',
	args: { state: 'initializing' },
};

export const Initial: Story = {
	name: 'initial',
	args: { state: 'initial' },
};

export const Loading: Story = {
	name: 'loading',
	args: { state: 'loading' },
};

export const CheckingLogin: Story = {
	name: 'checking-login',
	args: { state: 'checking-login' },
};

export const Processing: Story = {
	name: 'processing',
	args: {
		state: 'processing',
		trackCount: 42,
	},
};

export const Paused: Story = {
	name: 'paused',
	args: {
		state: 'paused',
		trackCount: 42,
		message: 'Paused here while you step away.',
	},
};

export const Done: Story = {
	name: 'done',
	args: {
		state: 'done',
		trackCount: 42,
	},
};

export const LoginRequired: Story = {
	name: 'login-required',
	args: { state: 'login-required' },
};

export const ErrorState: Story = {
	name: 'error',
	args: {
		state: 'error',
		message: 'Network blip. Want me to try again?',
	},
};

export const Dark: Story = {
	args: {
		state: 'initial',
		theme: 'dark',
	},
};

export const Overlay: Story = {
	args: {
		state: 'initial',
		presentation: 'overlay',
		showDismiss: true,
	},
};

export const ProcessingWithFootnote: Story = {
	args: {
		state: 'processing',
		trackCount: 42,
		skippedTrackCount: 3,
	},
};

export const DoneWithFootnote: Story = {
	args: {
		state: 'done',
		trackCount: 42,
		skippedTrackCount: 3,
	},
};

export const InitialActiveTab: Story = {
	args: {
		state: 'initial',
		source: 'active-soundcloud-tab',
	},
};
