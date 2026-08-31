import { createSignal } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@solidjs/testing-library';

vi.mock('solid-transition-group', () => ({
	Transition: (props: { children: import('solid-js').JSX.Element }) => (
		<>{props.children}</>
	),
}));

import {
	defaultExportFormatId,
	listExportFormats,
} from '@/common/model/export-format/registry';
import type { ResolvedPopupTheme } from '@/common/model/soundcloud-theme';
import type { BeatActionId } from '@/mascot/persona';
import { resolveBalloonCopy, resolvePersonaOptions } from '@/mascot/persona';
import {
	mapStateToBusy,
	mapStateToLiveMessage,
	type BeatState,
} from '@/mascot/model';
import { BeatView } from '@/mascot/view';

const unmountFns: Array<() => void> = [];

afterEach(() => {
	while (unmountFns.length > 0) {
		unmountFns.pop()?.();
	}
});

const STUB_POSE_URL =
	'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function renderBeatView(
	inputs?: Partial<{
		state: BeatState;
		trackCount: number;
		skippedTrackCount: number;
		message: string | undefined;
		theme: ResolvedPopupTheme;
	}>,
) {
	const [state, setState] = createSignal<BeatState>(inputs?.state ?? 'initial');
	const [trackCount, setTrackCount] = createSignal<number>(
		inputs?.trackCount ?? 0,
	);
	const [skippedTrackCount, setSkippedTrackCount] = createSignal<number>(
		inputs?.skippedTrackCount ?? 0,
	);
	const [message, setMessage] = createSignal<string | undefined>(
		inputs?.message,
	);
	const [theme, setTheme] = createSignal<ResolvedPopupTheme>(
		inputs?.theme ?? 'light',
	);
	const [selectedExportFormatId, setSelectedExportFormatId] = createSignal(
		defaultExportFormatId(),
	);

	const onAction = vi.fn<(actionId: BeatActionId) => void>();

	const buildCtx = () => ({
		trackCount: trackCount(),
		skippedTrackCount: skippedTrackCount(),
		source: 'likes-page' as const,
		message: message(),
	});

	const formatRows = listExportFormats().map((format) => ({
		id: format.id,
		label: format.label,
		worksWith: format.worksWith,
	}));

	const result = render(() => (
		<BeatView
			theme={theme}
			state={state}
			isVisible={() => true}
			poseUrl={() => STUB_POSE_URL}
			isStatusBusy={() => mapStateToBusy(state())}
			balloonCopy={() => resolveBalloonCopy(state(), buildCtx())}
			options={() => resolvePersonaOptions(state())}
			footnoteCopy={() => undefined}
			liveStatusMessage={() => mapStateToLiveMessage(state(), buildCtx())}
			formatSelection={() => ({
				formats: formatRows,
				selectedId: selectedExportFormatId(),
				onSelect: (id: string) => {
					const match = formatRows.find((row) => row.id === id);
					if (match === undefined) {
						return;
					}
					setSelectedExportFormatId(match.id);
				},
			})}
			onAction={onAction}
		/>
	));

	unmountFns.push(result.unmount);

	return {
		...result,
		setState,
		setTrackCount,
		setSkippedTrackCount,
		setMessage,
		setTheme,
		onAction,
	};
}

describe('BeatView', () => {
	it('renders sr-only h1', () => {
		const view = renderBeatView({ state: 'initial' });

		const h1 = view.container.querySelector('h1');
		expect(h1).toBeTruthy();
		expect(h1?.classList.contains('sr-only')).toBe(true);
	});

	it('applies dark theme attributes to the root', () => {
		const view = renderBeatView({ state: 'initial', theme: 'dark' });
		const root = view.container.querySelector('main');

		expect(root?.getAttribute('data-theme')).toBe('dark');
		expect(root?.getAttribute('style')).toContain('color-scheme: dark');
	});

	it('uses a transparent root for overlay presentation', () => {
		const view = render(() => (
			<BeatView
				presentation="overlay"
				theme={() => 'light'}
				state={() => 'initial'}
				isVisible={() => true}
				poseUrl={() => STUB_POSE_URL}
				isStatusBusy={() => false}
				balloonCopy={() => 'Hello'}
				options={() => []}
				footnoteCopy={() => undefined}
				liveStatusMessage={() => undefined}
				onAction={vi.fn()}
			/>
		));
		unmountFns.push(view.unmount);

		const root = view.container.querySelector('main');
		expect(root?.classList.contains('bg-transparent')).toBe(true);
		expect(root?.classList.contains('bg-white')).toBe(false);
		expect(root?.classList.contains('p-4')).toBe(false);
	});

	it('renders balloon copy from persona for initial state', () => {
		const view = renderBeatView({ state: 'initial' });
		const expectedCopy = resolveBalloonCopy('initial', {
			trackCount: 0,
			skippedTrackCount: 0,
			source: 'likes-page',
			message: undefined,
		});

		expect(view.getByText(expectedCopy)).toBeTruthy();
	});

	it('renders option button from persona for initial state', () => {
		const view = renderBeatView({ state: 'initial' });
		const options = resolvePersonaOptions('initial');

		for (const option of options) {
			expect(view.getByRole('button', { name: option.label })).toBeTruthy();
		}
	});

	it('renders aria-busy on busy states', () => {
		const view = renderBeatView({ state: 'processing' });

		expect(view.container.querySelector('[aria-busy="true"]')).toBeTruthy();
	});

	it('does not render aria-busy on non-busy states', () => {
		const view = renderBeatView({ state: 'initial' });

		expect(view.container.querySelector('[aria-busy="true"]')).toBeNull();
	});

	it('renders balloon copy for initializing state', () => {
		const view = renderBeatView({ state: 'initializing' });
		const expectedCopy = resolveBalloonCopy('initializing', {
			trackCount: 0,
			skippedTrackCount: 0,
			source: 'likes-page',
			message: undefined,
		});

		expect(view.getByText(expectedCopy)).toBeTruthy();
		expect(view.container.querySelector('[aria-busy="true"]')).toBeTruthy();
	});

	it('renders balloon copy for processing state with track count', () => {
		const view = renderBeatView({ state: 'processing', trackCount: 42 });
		const expectedCopy = resolveBalloonCopy('processing', {
			trackCount: 42,
			skippedTrackCount: 0,
			source: 'likes-page',
			message: undefined,
		});

		expect(view.getByText(expectedCopy)).toBeTruthy();
	});

	it('renders balloon copy for done state with track count', () => {
		const view = renderBeatView({ state: 'done', trackCount: 10 });
		const expectedCopy = resolveBalloonCopy('done', {
			trackCount: 10,
			skippedTrackCount: 0,
			source: 'likes-page',
			message: undefined,
		});

		expect(view.getByText(expectedCopy)).toBeTruthy();
	});

	it('renders balloon copy for saving state without a download button', () => {
		const view = renderBeatView({ state: 'saving', trackCount: 10 });
		const expectedCopy = resolveBalloonCopy('saving', {
			trackCount: 10,
			skippedTrackCount: 0,
			source: 'likes-page',
			message: undefined,
		});

		expect(view.getByText(expectedCopy)).toBeTruthy();
		expect(view.queryByRole('button', { name: 'Download backup' })).toBeNull();
		expect(view.container.querySelector('[aria-busy="true"]')).toBeTruthy();
	});

	it('renders role=alert for login-required state (alert before retry button)', () => {
		const view = renderBeatView({ state: 'login-required' });

		const alert = view.getByRole('alert');
		expect(alert).toBeTruthy();

		const retryOption = resolvePersonaOptions('login-required').find(
			(o) => o.actionId === 'retry',
		);
		expect(retryOption).toBeDefined();
		if (retryOption === undefined) return;
		const retryButton = view.getByRole('button', { name: retryOption.label });
		expect(retryButton).toBeTruthy();
		expect(
			Boolean(
				alert.compareDocumentPosition(retryButton) &
				Node.DOCUMENT_POSITION_FOLLOWING,
			),
		).toBe(true);
	});

	it('renders role=alert for error state (alert before retry button)', () => {
		const view = renderBeatView({ state: 'error', message: 'Boom!' });

		const alert = view.getByRole('alert');
		expect(alert.textContent).toContain('Boom!');

		const retryOption = resolvePersonaOptions('error').find(
			(o) => o.actionId === 'retry',
		);
		expect(retryOption).toBeDefined();
		if (retryOption === undefined) return;
		const retryButton = view.getByRole('button', { name: retryOption.label });
		expect(retryButton).toBeTruthy();
		expect(
			Boolean(
				alert.compareDocumentPosition(retryButton) &
				Node.DOCUMENT_POSITION_FOLLOWING,
			),
		).toBe(true);
	});

	it('does not render role=alert for non-error states', () => {
		const view = renderBeatView({ state: 'initial' });

		expect(view.queryByRole('alert')).toBeNull();
	});

	it('renders polite aria-live region', () => {
		const view = renderBeatView({ state: 'processing', trackCount: 1 });

		const liveRegion = view.container.querySelector('[aria-live="polite"]');
		expect(liveRegion).toBeTruthy();

		const expectedMsg = mapStateToLiveMessage('processing', {
			trackCount: 1,
			skippedTrackCount: 0,
			source: 'likes-page',
			message: undefined,
		});
		expect(liveRegion?.textContent).toBe(expectedMsg);
	});

	it('updates polite aria-live region when track count changes', async () => {
		const view = renderBeatView({ state: 'processing', trackCount: 1 });

		const liveRegion = view.container.querySelector('[aria-live="polite"]');
		expect(liveRegion).toBeTruthy();

		view.setTrackCount(5);
		await Promise.resolve();

		const expectedMsg = mapStateToLiveMessage('processing', {
			trackCount: 5,
			skippedTrackCount: 0,
			source: 'likes-page',
			message: undefined,
		});
		expect(liveRegion?.textContent).toBe(expectedMsg);
	});

	it('calls onAction with start when initial option clicked', () => {
		const view = renderBeatView({ state: 'initial' });
		const startOption = resolvePersonaOptions('initial').find(
			(o) => o.actionId === 'start',
		);
		expect(startOption).toBeDefined();
		if (startOption === undefined) return;

		fireEvent.click(view.getByRole('button', { name: startOption.label }));
		expect(view.onAction).toHaveBeenCalledWith('start');
	});

	it('calls onAction with cancel when checking-login option clicked', () => {
		const view = renderBeatView({ state: 'checking-login' });
		const cancelOption = resolvePersonaOptions('checking-login').find(
			(o) => o.actionId === 'cancel',
		);
		expect(cancelOption).toBeDefined();
		if (cancelOption === undefined) return;

		fireEvent.click(view.getByRole('button', { name: cancelOption.label }));
		expect(view.onAction).toHaveBeenCalledWith('cancel');
	});

	it('calls onAction with download when done option clicked', () => {
		const view = renderBeatView({ state: 'done', trackCount: 5 });
		const downloadOption = resolvePersonaOptions('done').find(
			(o) => o.actionId === 'download',
		);
		expect(downloadOption).toBeDefined();
		if (downloadOption === undefined) return;

		fireEvent.click(view.getByRole('button', { name: downloadOption.label }));
		expect(view.onAction).toHaveBeenCalledWith('download');
	});

	it('calls onAction with retry when error option clicked', () => {
		const view = renderBeatView({ state: 'error', message: 'oops' });
		const retryOption = resolvePersonaOptions('error').find(
			(o) => o.actionId === 'retry',
		);
		expect(retryOption).toBeDefined();
		if (retryOption === undefined) return;

		fireEvent.click(view.getByRole('button', { name: retryOption.label }));
		expect(view.onAction).toHaveBeenCalledWith('retry');
	});

	it('updates rendered output when state signal changes', async () => {
		const view = renderBeatView({ state: 'initial' });

		const initialCopy = resolveBalloonCopy('initial', {
			trackCount: 0,
			skippedTrackCount: 0,
			source: 'likes-page',
			message: undefined,
		});
		expect(view.getByText(initialCopy)).toBeTruthy();

		view.setTrackCount(7);
		view.setState('processing');
		await Promise.resolve();

		const processingCopy = resolveBalloonCopy('processing', {
			trackCount: 7,
			skippedTrackCount: 0,
			source: 'likes-page',
			message: undefined,
		});
		expect(view.queryByText(initialCopy)).toBeNull();
		expect(view.getByText(processingCopy)).toBeTruthy();
	});

	it('keeps layout mounted when boot transitions initializing to initial', async () => {
		const view = renderBeatView({ state: 'initializing' });
		const layout = view.container.querySelector('.beat-layout');

		expect(layout).toBeTruthy();

		view.setState('initial');
		await Promise.resolve();

		const initialCopy = resolveBalloonCopy('initial', {
			trackCount: 0,
			skippedTrackCount: 0,
			source: 'likes-page',
			message: undefined,
		});
		expect(view.getByText(initialCopy)).toBeTruthy();
		// Same fade key — node identity must stay so out-in never applies fade-exit-to.
		expect(view.container.querySelector('.beat-layout')).toBe(layout);
	});

	it('renders the mascot image', () => {
		const view = renderBeatView({ state: 'initial' });

		const img = view.container.querySelector('img');
		expect(img).toBeTruthy();
		expect(img?.getAttribute('src')).toBe(STUB_POSE_URL);
	});

	it('applies heartbeat class to mascot image when animating (busy state)', () => {
		const view = renderBeatView({ state: 'processing' });

		const img = view.container.querySelector('img');
		expect(img?.classList.contains('heartbeat')).toBe(true);
	});

	it('does not apply heartbeat class when not animating (non-busy state)', () => {
		const view = renderBeatView({ state: 'initial' });

		const img = view.container.querySelector('img');
		expect(img?.classList.contains('heartbeat')).toBe(false);
	});

	it('renders paused state balloon copy with message override', () => {
		const pauseMessage = 'Collection paused — SoundCloud tab is hidden.';
		const view = renderBeatView({ state: 'paused', message: pauseMessage });

		expect(view.getByText(pauseMessage)).toBeTruthy();
	});

	it('calls onDismiss when dismiss button clicked', () => {
		const onDismiss = vi.fn();
		const [state] = createSignal<BeatState>('initial');
		const result = render(() => (
			<BeatView
				theme={() => 'light'}
				state={state}
				isVisible={() => true}
				poseUrl={() => STUB_POSE_URL}
				isStatusBusy={() => false}
				balloonCopy={() =>
					resolveBalloonCopy('initial', {
						trackCount: 0,
						skippedTrackCount: 0,
						source: 'likes-page',
						message: undefined,
					})
				}
				options={() => resolvePersonaOptions('initial')}
				footnoteCopy={() => undefined}
				liveStatusMessage={() => undefined}
				onAction={vi.fn()}
				onDismiss={onDismiss}
			/>
		));
		unmountFns.push(result.unmount);

		const dismissButton = result.getByRole('button', { name: 'Dismiss' });
		fireEvent.click(dismissButton);
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it('does not render dismiss button when onDismiss is not provided', () => {
		const view = renderBeatView({ state: 'initial' });

		expect(view.queryByRole('button', { name: 'Dismiss' })).toBeNull();
	});

	it('renders format fieldset and radios in done state', () => {
		const view = renderBeatView({ state: 'done', trackCount: 10 });
		const formats = listExportFormats();

		expect(view.getByRole('group', { name: 'Backup format' })).toBeTruthy();
		expect(view.getAllByRole('radio')).toHaveLength(formats.length);

		const jsonRadio = view.getByRole('radio', { name: 'JSON' });
		expect(jsonRadio instanceof HTMLInputElement).toBe(true);
		if (!(jsonRadio instanceof HTMLInputElement)) {
			return;
		}
		expect(jsonRadio.checked).toBe(true);

		for (const format of formats) {
			expect(view.getByRole('radio', { name: format.label })).toBeTruthy();
			expect(view.getByText(format.worksWith)).toBeTruthy();
		}
	});

	it('selects another format when a sticker row is clicked', async () => {
		const view = renderBeatView({ state: 'done', trackCount: 10 });

		fireEvent.click(view.getByRole('radio', { name: 'CSV' }));
		await Promise.resolve();

		const csvRadio = view.getByRole('radio', { name: 'CSV' });
		const jsonRadio = view.getByRole('radio', { name: 'JSON' });
		expect(csvRadio instanceof HTMLInputElement).toBe(true);
		expect(jsonRadio instanceof HTMLInputElement).toBe(true);
		if (
			!(csvRadio instanceof HTMLInputElement) ||
			!(jsonRadio instanceof HTMLInputElement)
		) {
			return;
		}
		expect(csvRadio.checked).toBe(true);
		expect(jsonRadio.checked).toBe(false);
	});

	it('still calls onAction with download after format rows render', () => {
		const view = renderBeatView({ state: 'done', trackCount: 5 });
		const downloadOption = resolvePersonaOptions('done').find(
			(o) => o.actionId === 'download',
		);
		expect(downloadOption).toBeDefined();
		if (downloadOption === undefined) return;

		fireEvent.click(view.getByRole('button', { name: downloadOption.label }));
		expect(view.onAction).toHaveBeenCalledWith('download');
	});

	it('hides format rows on saving, initial, processing, and error', () => {
		const hiddenStates: ReadonlyArray<BeatState> = [
			'saving',
			'initial',
			'processing',
			'error',
		];

		for (const hiddenState of hiddenStates) {
			const view = renderBeatView({
				state: hiddenState,
				trackCount: 10,
				message: hiddenState === 'error' ? 'oops' : undefined,
			});

			expect(view.queryByRole('group', { name: 'Backup format' })).toBeNull();
			expect(view.queryAllByRole('radio')).toHaveLength(0);
		}
	});
});
