import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bindViewModel } from '@/common/viewmodel/bind-viewmodel';
import {
	SaveFilePickerCancelled,
	SaveFilePickerUnavailable,
	SaveFileWriteFailed,
} from '@/common/infrastructure/save-file-picker';
import { LOGIN_REQUIRED_MESSAGE } from '@/common/model/collection/login-required-message';
import {
	getExportFormat,
	listExportFormats,
} from '@/common/model/export-format/registry';
import { ExportUnavailable } from '@/common/model/messaging/background-rpcs';
import type { ResolvedPopupTheme } from '@/common/model/soundcloud-theme';
import { BackgroundUnreachable } from '@/mascot/collection-backend';
import type { CollectionSnapshot } from '@/mascot/collection-backend';
import {
	poseForState,
	resolveAccessibilityLiveMessage,
	resolveBalloonCopy,
	resolvePersonaOptions,
} from '@/mascot/persona';
import type { BeatPoseKey } from '@/mascot/persona';
import { poseResourcePath } from '@/mascot/pose-resource-path';
import { createMascotViewModel } from '@/mascot/view-model';
import { createMascotVisibility } from '@/mascot/visibility';
import {
	makeFakeCollectionBackend,
	type FakeCollectionBackend,
} from '@/test/fake-collection-backend';
import { silentLoggerLayer } from '@/test/effect-log-test';
import { Effect, Either, Layer, ManagedRuntime, Ref } from 'effect';

const { getResolvedPopupThemeMock } = vi.hoisted(() => ({
	getResolvedPopupThemeMock: vi.fn<() => Effect.Effect<ResolvedPopupTheme>>(
		() => Effect.succeed('light'),
	),
}));

const { startSaveFilePickerMock, awaitSaveFilePickerMock, writeTextFileMock } =
	vi.hoisted(() => ({
		startSaveFilePickerMock: vi.fn(),
		awaitSaveFilePickerMock: vi.fn(),
		writeTextFileMock: vi.fn(),
	}));

vi.mock('@/common/infrastructure/get-resolved-popup-theme', () => ({
	getResolvedPopupThemeEffect: getResolvedPopupThemeMock,
}));

vi.mock('@/common/infrastructure/save-file-picker', async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import('@/common/infrastructure/save-file-picker')
		>();
	return {
		...actual,
		startSaveFilePicker: startSaveFilePickerMock,
		awaitSaveFilePicker: awaitSaveFilePickerMock,
		writeTextFile: writeTextFileMock,
	};
});

vi.mock('solid-js', async (importOriginal) => {
	const actual = await importOriginal<typeof import('solid-js')>();
	return {
		...actual,
		onMount: vi.fn(),
		createEffect: vi.fn(),
	};
});

const writableFile = {
	createWritable: () =>
		Promise.resolve({
			write: () => Promise.resolve(undefined),
			close: () => Promise.resolve(undefined),
		}),
};

const idleSnapshot = {
	status: 'idle',
	trackCount: 0,
	message: undefined,
	skippedTrackCount: undefined,
	source: 'likes-page',
} as const satisfies CollectionSnapshot;

const runtimes: Array<{ readonly dispose: () => Promise<void> }> = [];

afterEach(async () => {
	while (runtimes.length > 0) {
		await runtimes.pop()?.dispose();
	}
});

const settle = () =>
	Effect.runPromise(
		Effect.gen(function* () {
			for (let step = 0; step < 20; step += 1) {
				yield* Effect.yieldNow();
			}
		}),
	);

async function makeVm(
	initiallyVisible = true,
	onSurfaceDismiss: () => void = () => undefined,
) {
	const fake = await Effect.runPromise(makeFakeCollectionBackend);
	const managed = ManagedRuntime.make(
		fake.layer.pipe(Layer.provideMerge(silentLoggerLayer)),
	);
	runtimes.push(managed);
	const runtime = await managed.runtime();
	const visibility = createMascotVisibility(initiallyVisible);
	const vm = createMascotViewModel({
		runtime,
		visibility,
		resolvePoseUrl: poseResourcePath,
		onSurfaceDismiss,
	});
	await settle();
	return { vm, fake, runtime, managed, visibility };
}

const emit = async (
	fake: FakeCollectionBackend,
	snapshot: CollectionSnapshot,
) => {
	await Effect.runPromise(fake.emit(snapshot));
	await settle();
};

const endUpdates = async (fake: FakeCollectionBackend, reason: string) => {
	await Effect.runPromise(fake.end(reason));
	await settle();
};

const recordedCalls = (fake: FakeCollectionBackend) =>
	Effect.runPromise(Ref.get(fake.calls));

const clearCalls = (fake: FakeCollectionBackend) =>
	Effect.runPromise(Ref.set(fake.calls, []));

describe('MascotViewModel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getResolvedPopupThemeMock.mockReset();
		getResolvedPopupThemeMock.mockImplementation(() => Effect.succeed('light'));
		startSaveFilePickerMock.mockReset();
		startSaveFilePickerMock.mockImplementation(() =>
			Effect.succeed({ promise: Promise.resolve({}) }),
		);
		awaitSaveFilePickerMock.mockReset();
		awaitSaveFilePickerMock.mockImplementation(() =>
			Effect.succeed(writableFile),
		);
		writeTextFileMock.mockReset();
		writeTextFileMock.mockImplementation(() => Effect.void);
	});

	it('applies live snapshots in order', async () => {
		const { vm, fake } = await makeVm();

		await emit(fake, idleSnapshot);
		expect(vm.state()).toBe('initial');
		expect(vm.trackCount()).toBe(0);

		await emit(fake, {
			status: 'collecting',
			trackCount: 12,
			skippedTrackCount: 2,
		});
		expect(vm.state()).toBe('processing');
		expect(vm.trackCount()).toBe(12);
		expect(vm.skippedTrackCount()).toBe(2);
		expect(vm.isStatusBusy()).toBe(true);

		await emit(fake, { status: 'done', trackCount: 12 });
		expect(vm.state()).toBe('done');
		expect(vm.trackCount()).toBe(12);

		await emit(fake, {
			status: 'paused',
			trackCount: 5,
			message:
				'Collection paused — SoundCloud tab is hidden. Please focus it to resume.',
		});
		expect(vm.state()).toBe('paused');
		expect(vm.message()).toBe(
			'Collection paused — SoundCloud tab is hidden. Please focus it to resume.',
		);
	});

	it('keeps the last state until the stream fails', async () => {
		const { vm, fake } = await makeVm();
		await emit(fake, idleSnapshot);
		await settle();
		expect(vm.state()).toBe('initial');

		await endUpdates(fake, 'ExtensionContextInvalidated');
		expect(vm.state()).toBe('error');
		expect(vm.message()).toBe(
			'Could not reach the extension. ExtensionContextInvalidated',
		);
		expect(vm.options()).toEqual([{ label: 'Try again', actionId: 'retry' }]);
	});

	it('teardown interrupts the subscription', async () => {
		const { vm, fake } = await makeVm();
		await emit(fake, idleSnapshot);
		vm.teardown();
		await settle();

		await emit(fake, { status: 'collecting', trackCount: 4 });
		expect(vm.state()).toBe('initial');
		expect(vm.trackCount()).toBe(0);
	});

	it('syncState refreshes once and applies the theme', async () => {
		getResolvedPopupThemeMock.mockImplementationOnce(() =>
			Effect.succeed('dark'),
		);
		const { vm, fake, managed } = await makeVm();
		await emit(fake, idleSnapshot);
		await clearCalls(fake);

		await managed.runPromise(vm.effects.syncState);

		expect(await recordedCalls(fake)).toEqual(['refresh']);
		expect(vm.theme()).toBe('dark');
		expect(getResolvedPopupThemeMock).toHaveBeenCalledTimes(1);
		expect(vm.state()).toBe('initial');
	});

	it('logs a refresh failure and leaves the state unchanged', async () => {
		const { vm, fake, managed } = await makeVm();
		await emit(fake, idleSnapshot);
		await Effect.runPromise(
			fake.failNext('refresh', new BackgroundUnreachable({ reason: 'asleep' })),
		);

		await managed.runPromise(vm.effects.syncState);

		expect(vm.state()).toBe('initial');
		expect(await recordedCalls(fake)).toEqual(['refresh']);
	});

	it('startCollection stays loading until a snapshot arrives', async () => {
		const { vm, fake, managed } = await makeVm();

		await managed.runPromise(vm.effects.startCollection);

		expect(vm.state()).toBe('loading');
		expect(await recordedCalls(fake)).toEqual(['startCollection']);

		await emit(fake, { status: 'checking-login', trackCount: 0 });
		expect(vm.state()).toBe('checking-login');
	});

	it('startCollection shows the unreachable reason', async () => {
		const { vm, fake, managed } = await makeVm();
		await Effect.runPromise(
			fake.failNext(
				'startCollection',
				new BackgroundUnreachable({ reason: 'x' }),
			),
		);

		await managed.runPromise(vm.effects.startCollection);

		expect(vm.state()).toBe('error');
		expect(vm.message()).toBe('x');
		expect(await recordedCalls(fake)).toEqual(['startCollection']);
	});

	it('retryAfterError re-applies login-required without cancelling', async () => {
		const { vm, fake, managed } = await makeVm();
		await emit(fake, {
			status: 'login-required',
			trackCount: 0,
			message: LOGIN_REQUIRED_MESSAGE,
		});
		await clearCalls(fake);

		await managed.runPromise(vm.effects.retryAfterError);

		expect(await recordedCalls(fake)).toEqual(['refresh']);
		expect(vm.state()).toBe('login-required');
		expect(vm.message()).toBe(LOGIN_REQUIRED_MESSAGE);
	});

	it('retryAfterError cancels first after an error snapshot', async () => {
		const { vm, fake, managed } = await makeVm();
		await emit(fake, {
			status: 'error',
			trackCount: 0,
			message: 'the likes page changed',
		});
		await clearCalls(fake);

		await managed.runPromise(vm.effects.retryAfterError);

		expect(await recordedCalls(fake)).toEqual(['cancelCollection', 'refresh']);
		expect(vm.state()).toBe('error');
		expect(vm.message()).toBe('the likes page changed');
	});

	it('cancelCollection returns to initial unless the command fails', async () => {
		const { vm, fake, managed } = await makeVm();
		await emit(fake, { status: 'collecting', trackCount: 3 });

		await managed.runPromise(vm.effects.cancelCollection);

		expect(vm.state()).toBe('initial');
		expect(await recordedCalls(fake)).toEqual(['cancelCollection']);

		await emit(fake, { status: 'collecting', trackCount: 3 });
		await Effect.runPromise(
			fake.failNext(
				'cancelCollection',
				new BackgroundUnreachable({ reason: 'nope' }),
			),
		);
		const failed = await Effect.runPromise(
			vm.effects.cancelCollection.pipe(Effect.either),
		);
		expect(Either.isLeft(failed)).toBe(true);
		expect(vm.state()).toBe('processing');
	});

	it('starts in initializing state before a snapshot', async () => {
		const { vm } = await makeVm();

		expect(vm.state()).toBe('initializing');
		expect(vm.theme()).toBe('light');
		expect(vm.source()).toBe('likes-page');
		expect(vm.isStatusBusy()).toBe(true);
		expect(vm.pose()).toBe(poseForState('initializing'));
		expect(vm.options()).toEqual(resolvePersonaOptions('initializing'));
		expect(vm.balloonCopy()).toBe(
			resolveBalloonCopy('initializing', {
				trackCount: 0,
				skippedTrackCount: 0,
				source: 'likes-page',
				message: undefined,
			}),
		);
		expect(vm.liveStatusMessage()).toBe(
			resolveAccessibilityLiveMessage('initializing', {
				trackCount: 0,
				skippedTrackCount: 0,
				source: 'likes-page',
				message: undefined,
			}),
		);
	});

	it('persona accessors follow an idle snapshot', async () => {
		const { vm, fake } = await makeVm();
		await emit(fake, {
			...idleSnapshot,
			source: 'active-soundcloud-tab',
		});

		expect(vm.state()).toBe('initial');
		expect(vm.source()).toBe('active-soundcloud-tab');
		expect(vm.pose()).toBe(poseForState('initial'));
		expect(vm.options()).toEqual(resolvePersonaOptions('initial'));
		expect(vm.balloonCopy()).toBe(
			resolveBalloonCopy('initial', {
				trackCount: 0,
				skippedTrackCount: 0,
				source: 'active-soundcloud-tab',
				message: undefined,
			}),
		);
		expect(vm.liveStatusMessage()).toBeUndefined();
	});

	it('shows login-required from a snapshot', async () => {
		const { vm, fake } = await makeVm();
		await emit(fake, {
			status: 'login-required',
			trackCount: 0,
			message: LOGIN_REQUIRED_MESSAGE,
		});

		expect(vm.state()).toBe('login-required');
		expect(vm.message()).toBe(LOGIN_REQUIRED_MESSAGE);
	});
});

describe('MascotViewModel — visibility', () => {
	it('overlay starts hidden when initiallyVisible=false', async () => {
		const { vm } = await makeVm(false);
		expect(vm.isVisible()).toBe(false);
	});

	it('popup starts visible when initiallyVisible=true', async () => {
		const { vm } = await makeVm(true);
		expect(vm.isVisible()).toBe(true);
	});

	it('summon() makes the mascot visible', async () => {
		const { vm, visibility } = await makeVm(false);
		expect(vm.isVisible()).toBe(false);
		visibility.summon();
		expect(vm.isVisible()).toBe(true);
	});

	it('dismiss() hides the mascot', async () => {
		const { vm, visibility } = await makeVm(true);
		expect(vm.isVisible()).toBe(true);
		visibility.dismiss();
		expect(vm.isVisible()).toBe(false);
	});

	it('toggle() flips visibility', async () => {
		const { vm, visibility } = await makeVm(false);
		expect(vm.isVisible()).toBe(false);
		visibility.toggle();
		expect(vm.isVisible()).toBe(true);
		visibility.toggle();
		expect(vm.isVisible()).toBe(false);
	});
});

describe('MascotViewModel — poseUrl', () => {
	it('resolves pose URL via resolvePoseUrl', async () => {
		const { vm } = await makeVm();
		expect(vm.poseUrl()).toMatch(/\.webp$/);
	});

	it('uses custom resolvePoseUrl when provided', async () => {
		const fake = await Effect.runPromise(makeFakeCollectionBackend);
		const managed = ManagedRuntime.make(
			fake.layer.pipe(Layer.provideMerge(silentLoggerLayer)),
		);
		runtimes.push(managed);
		const runtime = await managed.runtime();
		const customResolver = vi.fn((pose: BeatPoseKey) => `custom://${pose}`);
		const vm = createMascotViewModel({
			runtime,
			visibility: createMascotVisibility(true),
			resolvePoseUrl: customResolver,
			onSurfaceDismiss: () => undefined,
		});

		expect(vm.poseUrl()).toBe(`custom://${vm.pose()}`);
		expect(customResolver).toHaveBeenCalledWith(vm.pose());
	});
});

describe('MascotViewModel — handleAction', () => {
	it('routes each actionId to the matching effect', async () => {
		const { vm } = await makeVm();
		expect(vm.effects.handleAction('start')).toBe(vm.effects.startCollection);
		expect(vm.effects.handleAction('cancel')).toBe(vm.effects.cancelCollection);
		expect(vm.effects.handleAction('download')).toBe(vm.effects.download);
		expect(vm.effects.handleAction('retry')).toBe(vm.effects.retryAfterError);
	});
});

describe('MascotViewModel — download', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getResolvedPopupThemeMock.mockImplementation(() => Effect.succeed('light'));
		startSaveFilePickerMock.mockImplementation(() =>
			Effect.succeed({ promise: Promise.resolve({}) }),
		);
		awaitSaveFilePickerMock.mockImplementation(() =>
			Effect.succeed(writableFile),
		);
		writeTextFileMock.mockImplementation(() => Effect.void);
	});

	it('opens the picker before downloadExport in the click turn', async () => {
		const { vm, fake, runtime } = await makeVm();
		await Effect.runPromise(
			Ref.set(fake.exportBody, Effect.succeed('{"format_version":1}')),
		);
		const order: string[] = [];
		startSaveFilePickerMock.mockImplementation(() => {
			const callsNow = Effect.runSync(Ref.get(fake.calls));
			expect(callsNow.some((call) => call.startsWith('downloadExport'))).toBe(
				false,
			);
			order.push('startSaveFilePicker');
			return Effect.succeed({ promise: Promise.resolve({}) });
		});

		const bound = bindViewModel(runtime, vm, 'MascotViewModel');
		bound.actions.download();

		expect(order).toEqual(['startSaveFilePicker']);
		expect(Effect.runSync(Ref.get(fake.calls))).toEqual([
			'downloadExport:json',
			'downloadSucceeded',
		]);
		const jsonFormat = getExportFormat('json');
		expect(startSaveFilePickerMock).toHaveBeenCalledWith(
			expect.stringMatching(/^likes-to-go-\d{4}-\d{2}-\d{2}\.json$/),
			jsonFormat.pickerTypes,
			expect.any(AbortSignal),
		);
		expect(writeTextFileMock).toHaveBeenCalledWith(
			expect.anything(),
			'{"format_version":1}',
		);
		expect(vm.state()).toBe('saving');

		await emit(fake, idleSnapshot);
		expect(vm.state()).toBe('initial');
	});

	it('reports a missing payload for ExportUnavailable and an empty body', async () => {
		const { vm, fake, managed } = await makeVm();
		await Effect.runPromise(
			fake.failNext(
				'downloadExport:json',
				new ExportUnavailable({ status: 'idle' }),
			),
		);

		await managed.runPromise(vm.effects.download);

		expect(await recordedCalls(fake)).toEqual([
			'downloadExport:json',
			'downloadFailed:Could not save your export|Export payload was missing',
		]);

		await clearCalls(fake);
		await Effect.runPromise(Ref.set(fake.exportBody, Effect.succeed('')));
		await managed.runPromise(vm.effects.download);
		expect(await recordedCalls(fake)).toEqual([
			'downloadExport:json',
			'downloadFailed:Could not save your export|Export payload was missing',
		]);
	});

	it('reports an unreachable download', async () => {
		const { vm, fake, managed } = await makeVm();
		await Effect.runPromise(
			fake.failNext(
				'downloadExport:json',
				new BackgroundUnreachable({ reason: 'port closed' }),
			),
		);

		await managed.runPromise(vm.effects.download);

		expect(await recordedCalls(fake)).toContain(
			'downloadFailed:Could not save your export|port closed',
		);
	});

	it('reports cancel, write failure, and success', async () => {
		const { vm, fake, managed } = await makeVm();
		await Effect.runPromise(
			Ref.set(fake.exportBody, Effect.succeed('{"format_version":1}')),
		);
		awaitSaveFilePickerMock.mockImplementation(() =>
			Effect.fail(new SaveFilePickerCancelled({ reason: 'cancel' })),
		);

		await managed.runPromise(vm.effects.download);

		expect(await recordedCalls(fake)).toContain('downloadCancelled');
		expect(writeTextFileMock).not.toHaveBeenCalled();
		expect(vm.state()).toBe('saving');

		await clearCalls(fake);
		awaitSaveFilePickerMock.mockImplementation(() =>
			Effect.succeed(writableFile),
		);
		writeTextFileMock.mockImplementation(() =>
			Effect.fail(new SaveFileWriteFailed({ reason: 'disk full' })),
		);
		await managed.runPromise(vm.effects.download);
		expect(await recordedCalls(fake)).toContain(
			'downloadFailed:Could not save your export|disk full',
		);

		await clearCalls(fake);
		writeTextFileMock.mockImplementation(() => Effect.void);
		await managed.runPromise(vm.effects.download);
		expect(await recordedCalls(fake)).toContain('downloadSucceeded');
	});

	it('keeps collected tracks when the picker cannot open', async () => {
		startSaveFilePickerMock.mockImplementation(() =>
			Effect.fail(new SaveFilePickerUnavailable({ reason: 'missing' })),
		);
		const { vm, fake, managed } = await makeVm();
		await emit(fake, { status: 'done', trackCount: 1 });
		await clearCalls(fake);

		await managed.runPromise(vm.effects.download);

		expect(vm.state()).toBe('error');
		expect(vm.message()).toBe(
			'Could not open the save dialog. Want to try again?',
		);
		expect(await recordedCalls(fake)).toEqual([]);

		await managed.runPromise(vm.effects.retryAfterError);

		expect(await recordedCalls(fake)).toEqual(['refresh']);
		expect(vm.state()).toBe('done');
		expect(vm.trackCount()).toBe(1);
	});
});

describe('MascotViewModel — export format selection', () => {
	beforeEach(() => {
		getResolvedPopupThemeMock.mockImplementation(() => Effect.succeed('light'));
		startSaveFilePickerMock.mockImplementation(() =>
			Effect.succeed({ promise: Promise.resolve({}) }),
		);
		awaitSaveFilePickerMock.mockImplementation(() =>
			Effect.succeed(writableFile),
		);
		writeTextFileMock.mockImplementation(() => Effect.void);
	});

	it('maps exportFormatRows from the registry', async () => {
		const { vm } = await makeVm();
		expect(vm.selectedExportFormatId()).toBe('json');
		expect(vm.exportFormatRows()).toEqual(
			listExportFormats().map((format) => ({
				id: format.id,
				label: format.label,
				worksWith: format.worksWith,
			})),
		);
	});

	it('selects csv and no-ops unknown ids', async () => {
		const { vm } = await makeVm();
		vm.selectExportFormat('csv');
		expect(vm.selectedExportFormatId()).toBe('csv');
		vm.selectExportFormat('xlsx');
		expect(vm.selectedExportFormatId()).toBe('csv');
	});

	it('uses the selected csv format and resets after idle', async () => {
		const { vm, fake, managed } = await makeVm();
		await Effect.runPromise(
			Ref.set(fake.exportBody, Effect.succeed('title,artist\nSong,Artist')),
		);
		await emit(fake, { status: 'done', trackCount: 1 });
		vm.selectExportFormat('csv');
		await managed.runPromise(vm.effects.download);

		const csvFormat = getExportFormat('csv');
		expect(startSaveFilePickerMock).toHaveBeenCalledWith(
			expect.stringMatching(/^likes-to-go-\d{4}-\d{2}-\d{2}\.csv$/),
			csvFormat.pickerTypes,
			expect.any(AbortSignal),
		);
		expect(await recordedCalls(fake)).toContain('downloadExport:csv');
		expect(writeTextFileMock).toHaveBeenCalledWith(
			expect.anything(),
			'title,artist\nSong,Artist',
		);

		await emit(fake, idleSnapshot);
		expect(vm.state()).toBe('initial');
		expect(vm.selectedExportFormatId()).toBe('json');
	});

	it('keeps csv selection when the picker is cancelled', async () => {
		writeTextFileMock.mockClear();
		awaitSaveFilePickerMock.mockImplementation(() =>
			Effect.fail(new SaveFilePickerCancelled({ reason: 'cancel' })),
		);
		const { vm, fake, managed } = await makeVm();
		await Effect.runPromise(
			Ref.set(fake.exportBody, Effect.succeed('title,artist\nSong,Artist')),
		);
		await emit(fake, { status: 'done', trackCount: 1 });
		vm.selectExportFormat('csv');

		await managed.runPromise(vm.effects.download);
		await emit(fake, { status: 'done', trackCount: 1 });

		expect(vm.state()).toBe('done');
		expect(vm.selectedExportFormatId()).toBe('csv');
		expect(writeTextFileMock).not.toHaveBeenCalled();
		expect(await recordedCalls(fake)).toContain('downloadCancelled');
	});

	it('resets to json when dismissed from done', async () => {
		const { vm, fake, managed } = await makeVm();
		await emit(fake, { status: 'done', trackCount: 3 });
		vm.selectExportFormat('csv');
		expect(vm.selectedExportFormatId()).toBe('csv');

		await managed.runPromise(vm.effects.dismiss);

		expect(vm.state()).toBe('initial');
		expect(vm.selectedExportFormatId()).toBe('json');
	});

	it('resets to json on a fresh done from processing, not from saving', async () => {
		const { vm, fake } = await makeVm();
		await emit(fake, { status: 'done', trackCount: 3 });
		vm.selectExportFormat('csv');
		expect(vm.selectedExportFormatId()).toBe('csv');

		await emit(fake, { status: 'collecting', trackCount: 4 });
		expect(vm.selectedExportFormatId()).toBe('csv');

		await emit(fake, { status: 'done', trackCount: 4 });
		expect(vm.selectedExportFormatId()).toBe('json');
	});
});

describe('MascotViewModel — dismiss', () => {
	beforeEach(() => {
		getResolvedPopupThemeMock.mockImplementation(() => Effect.succeed('light'));
		startSaveFilePickerMock.mockImplementation(() =>
			Effect.succeed({ promise: Promise.resolve({}) }),
		);
		awaitSaveFilePickerMock.mockImplementation(() => Effect.never);
	});

	it('hides Beat without cancelling unless a backup is ready', async () => {
		const onSurfaceDismiss = vi.fn();
		const { vm, fake, managed } = await makeVm(true, onSurfaceDismiss);

		await managed.runPromise(vm.effects.dismiss);

		expect(await recordedCalls(fake)).toEqual([]);
		expect(onSurfaceDismiss).toHaveBeenCalledTimes(1);
	});

	it('returns a ready backup to idle when dismissed', async () => {
		const onSurfaceDismiss = vi.fn();
		const { vm, fake, managed } = await makeVm(true, onSurfaceDismiss);
		await emit(fake, { status: 'done', trackCount: 3 });

		await managed.runPromise(vm.effects.dismiss);

		expect(await recordedCalls(fake)).toEqual(['cancelCollection']);
		expect(vm.state()).toBe('initial');
		expect(onSurfaceDismiss).toHaveBeenCalledTimes(1);
	});

	it('returns a saving backup to idle and aborts the picker', async () => {
		const onSurfaceDismiss = vi.fn();
		let pickerSignal: AbortSignal | undefined;
		startSaveFilePickerMock.mockImplementation(
			(_filename: string, _types: unknown, signal: AbortSignal) => {
				pickerSignal = signal;
				return Effect.succeed({ promise: Promise.resolve({}) });
			},
		);
		const { vm, fake, managed } = await makeVm(true, onSurfaceDismiss);
		await Effect.runPromise(
			Ref.set(fake.exportBody, Effect.succeed('{"format_version":1}')),
		);
		void managed.runPromise(vm.effects.download);
		await settle();
		expect(vm.state()).toBe('saving');

		await managed.runPromise(vm.effects.dismiss);

		expect(pickerSignal?.aborted).toBe(true);
		expect(await recordedCalls(fake)).toContain('cancelCollection');
		expect(vm.state()).toBe('initial');
		expect(onSurfaceDismiss).toHaveBeenCalledTimes(1);
	});
});
