import { createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@solidjs/testing-library';

vi.mock('solid-transition-group', () => ({
	Transition: (props: { children: import('solid-js').JSX.Element }) => (
		<>{props.children}</>
	),
}));

import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
import type { PopupSource, PopupState } from '@/popup/components/popup/model';
import { PopupView } from '@/popup/components/popup/view';

const unmountFns: Array<() => void> = [];

afterEach(() => {
	while (unmountFns.length > 0) {
		unmountFns.pop()?.();
	}
});

function renderPopupView(
	inputs?: Partial<{
		state: PopupState;
		trackCount: number;
		skippedTrackCount: number;
		message: string | undefined;
		source: PopupSource;
	}>,
) {
	const [state, setState] = createSignal<PopupState>(
		inputs?.state ?? 'initial',
	);
	const [trackCount, setTrackCount] = createSignal<number>(
		inputs?.trackCount ?? 0,
	);
	const [skippedTrackCount, setSkippedTrackCount] = createSignal<number>(
		inputs?.skippedTrackCount ?? 0,
	);
	const [message, setMessage] = createSignal<string | undefined>(
		inputs?.message,
	);
	const [source, setSource] = createSignal<PopupSource>(
		inputs?.source ?? 'likes-page',
	);

	const onStart = vi.fn();
	const onRetryFromError = vi.fn();
	const onCancel = vi.fn();
	const onDownload = vi.fn();

	const result = render(() => (
		<PopupView
			state={state}
			trackCount={trackCount}
			skippedTrackCount={skippedTrackCount}
			message={message}
			source={source}
			onStart={onStart}
			onRetryFromError={onRetryFromError}
			onCancel={onCancel}
			onDownload={onDownload}
		/>
	));

	unmountFns.push(result.unmount);

	return {
		...result,
		setState,
		setTrackCount,
		setSkippedTrackCount,
		setMessage,
		setSource,
		onStart,
		onRetryFromError,
		onCancel,
		onDownload,
	};
}

describe('Popup view', () => {
	it('renders the initial state', () => {
		const popup = renderPopupView({ state: 'initial' });

		expect(popup.getByRole('button', { name: '❤️ Likes to go' })).toBeTruthy();
		expect(popup.getByText('Will open your likes page')).toBeTruthy();
	});

	it('renders the active SoundCloud tab source', () => {
		const popup = renderPopupView({
			state: 'initial',
			source: 'active-soundcloud-tab',
		});

		expect(
			popup.getByText('Will collect from current SoundCloud tab'),
		).toBeTruthy();
	});

	it('renders the initializing state', () => {
		const popup = renderPopupView({ state: 'initializing' });

		expect(popup.getByText('Loading…')).toBeTruthy();
		expect(popup.queryByRole('button', { name: '❤️ Likes to go' })).toBeNull();
	});

	it('renders the loading state', () => {
		const popup = renderPopupView({ state: 'loading' });

		expect(popup.getByText('Starting…')).toBeTruthy();
		expect(popup.queryByRole('button')).toBeNull();
	});

	it('renders the checking-login state', () => {
		const popup = renderPopupView({
			state: 'checking-login',
			trackCount: 0,
			skippedTrackCount: 0,
		});

		expect(popup.getByText('Checking login status…')).toBeTruthy();
		expect(popup.getByRole('button', { name: 'Cancel order' })).toBeTruthy();
	});

	it('renders the processing state', () => {
		const popup = renderPopupView({
			state: 'processing',
			trackCount: 42,
			skippedTrackCount: 0,
		});

		expect(popup.getByText('Collecting likes… (42 found)')).toBeTruthy();
		expect(popup.getByRole('button', { name: 'Cancel order' })).toBeTruthy();
		expect(popup.queryByText('tracks could not be read yet')).toBeNull();
	});

	it('renders the processing state with skipped tracks warning', () => {
		const popup = renderPopupView({
			state: 'processing',
			trackCount: 5,
			skippedTrackCount: 2,
		});

		expect(popup.getByText('2 tracks could not be read yet')).toBeTruthy();
	});

	it('renders the paused state with a visibility pause message', () => {
		const popup = renderPopupView({
			state: 'paused',
			trackCount: 5,
			message:
				'Collection paused — SoundCloud tab is hidden. Please focus it to resume.',
		});

		expect(
			popup.getByText(
				'Collection paused — SoundCloud tab is hidden. Please focus it to resume.',
			),
		).toBeTruthy();
	});

	it('renders the done state', () => {
		const popup = renderPopupView({
			state: 'done',
			trackCount: 10,
			skippedTrackCount: 0,
		});

		expect(popup.getByRole('button', { name: '💚 Ready to go' })).toBeTruthy();
		expect(popup.getByText('Export ready! 10 tracks collected.')).toBeTruthy();
	});

	it('renders the done state with skipped tracks warning', () => {
		const popup = renderPopupView({
			state: 'done',
			skippedTrackCount: 3,
		});

		expect(popup.getByText('3 tracks could not be read')).toBeTruthy();
	});

	it('renders login-required with lock icon prefix and custom message', () => {
		const popup = renderPopupView({
			state: 'login-required',
			message: 'Please log in to SoundCloud, then try again.',
		});

		const alert = popup.getByRole('alert');
		expect(alert.textContent).toContain('🔐');
		expect(alert.textContent).toContain(
			'Please log in to SoundCloud, then try again.',
		);
		expect(popup.getByRole('button', { name: 'Try again' })).toBeTruthy();
	});

	it('renders login-required with default message when message is undefined', () => {
		const popup = renderPopupView({
			state: 'login-required',
			message: undefined,
		});

		const alert = popup.getByRole('alert');
		expect(alert.textContent).toContain(LOGIN_REQUIRED_MESSAGE);
	});

	it('renders the error state', () => {
		const popup = renderPopupView({
			state: 'error',
			message: 'Boom',
		});

		const alert = popup.getByRole('alert');
		expect(alert.textContent).toContain('Boom');
		expect(popup.getByRole('button', { name: '❤️ Try again' })).toBeTruthy();
	});

	it('calls onStart when clicking Start in the initial state', () => {
		const popup = renderPopupView({ state: 'initial' });

		fireEvent.click(popup.getByRole('button', { name: '❤️ Likes to go' }));
		expect(popup.onStart).toHaveBeenCalledTimes(1);
	});

	it('calls onCancel when clicking Cancel in the processing state', () => {
		const popup = renderPopupView({
			state: 'processing',
			trackCount: 1,
		});

		fireEvent.click(popup.getByRole('button', { name: 'Cancel order' }));
		expect(popup.onCancel).toHaveBeenCalledTimes(1);
	});

	it('calls onDownload when clicking Ready in the done state', () => {
		const popup = renderPopupView({ state: 'done' });

		fireEvent.click(popup.getByRole('button', { name: '💚 Ready to go' }));
		expect(popup.onDownload).toHaveBeenCalledTimes(1);
	});

	it('calls onRetryFromError when clicking Try again in the error state', () => {
		const popup = renderPopupView({
			state: 'error',
			message: 'Boom',
		});

		fireEvent.click(popup.getByRole('button', { name: '❤️ Try again' }));
		expect(popup.onRetryFromError).toHaveBeenCalledTimes(1);
	});

	it('updates the rendered output when the state signal changes', async () => {
		const popup = renderPopupView({ state: 'initial' });

		expect(popup.queryByText('Collecting likes… (7 found)')).toBeNull();
		expect(popup.getByText('Will open your likes page')).toBeTruthy();

		popup.setTrackCount(7);
		popup.setSkippedTrackCount(0);
		popup.setState('processing');

		await Promise.resolve();

		expect(popup.queryByText('Will open your likes page')).toBeNull();
		expect(popup.getByText('Collecting likes… (7 found)')).toBeTruthy();
	});
});
