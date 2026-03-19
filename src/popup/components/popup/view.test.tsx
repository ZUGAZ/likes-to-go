import { createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@solidjs/testing-library';

vi.mock('solid-transition-group', () => ({
	Transition: (props: { children: import('solid-js').JSX.Element }) => (
		<>{props.children}</>
	),
}));

import type { PopupState } from '@/popup/components/popup/model';
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
		errorMessage: string | undefined;
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
	const [errorMessage, setErrorMessage] = createSignal<string | undefined>(
		inputs?.errorMessage,
	);

	const onStart = vi.fn();
	const onCancel = vi.fn();
	const onDownload = vi.fn();

	const result = render(() => (
		<PopupView
			state={state}
			trackCount={trackCount}
			skippedTrackCount={skippedTrackCount}
			errorMessage={errorMessage}
			onStart={onStart}
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
		setErrorMessage,
		onStart,
		onCancel,
		onDownload,
	};
}

describe('Popup view', () => {
	it('renders the initial state', () => {
		const popup = renderPopupView({ state: 'initial' });

		expect(popup.getByRole('button', { name: '❤️ Likes to go' })).toBeTruthy();
		expect(popup.getByText('Waiting for order')).toBeTruthy();
	});

	it('renders the loading state', () => {
		const popup = renderPopupView({ state: 'loading' });

		expect(popup.getByText('Starting…')).toBeTruthy();
		expect(popup.queryByRole('button')).toBeNull();
	});

	it('renders the processing state', () => {
		const popup = renderPopupView({
			state: 'processing',
			trackCount: 42,
			skippedTrackCount: 0,
		});

		expect(popup.getByText('preparing 42 tracks…')).toBeTruthy();
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

	it('renders the done state', () => {
		const popup = renderPopupView({ state: 'done', skippedTrackCount: 0 });

		expect(popup.getByRole('button', { name: '💚 Ready to go' })).toBeTruthy();
	});

	it('renders the done state with skipped tracks warning', () => {
		const popup = renderPopupView({
			state: 'done',
			skippedTrackCount: 3,
		});

		expect(popup.getByText('3 tracks could not be read')).toBeTruthy();
	});

	it('renders the error state', () => {
		const popup = renderPopupView({
			state: 'error',
			errorMessage: 'Boom',
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

	it('calls onStart when clicking Try again in the error state', () => {
		const popup = renderPopupView({
			state: 'error',
			errorMessage: 'Boom',
		});

		fireEvent.click(popup.getByRole('button', { name: '❤️ Try again' }));
		expect(popup.onStart).toHaveBeenCalledTimes(1);
	});

	it('updates the rendered output when the state signal changes', async () => {
		const popup = renderPopupView({ state: 'initial' });

		expect(popup.queryByText('preparing 7 tracks…')).toBeNull();
		expect(popup.getByText('Waiting for order')).toBeTruthy();

		popup.setTrackCount(7);
		popup.setSkippedTrackCount(0);
		popup.setState('processing');

		await Promise.resolve();

		expect(popup.queryByText('Waiting for order')).toBeNull();
		expect(popup.getByText('preparing 7 tracks…')).toBeTruthy();
	});
});
