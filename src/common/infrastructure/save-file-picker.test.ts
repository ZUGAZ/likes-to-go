import { describe, expect, it, vi } from 'vitest';
import { Effect } from 'effect';

import {
	awaitSaveFilePicker,
	startSaveFilePicker,
	writeTextFile,
} from '@/common/infrastructure/save-file-picker';

describe('save-file-picker', () => {
	it('startSaveFilePicker calls showSaveFilePicker without awaiting', async () => {
		const picker = vi.fn(() => Promise.resolve({ createWritable: vi.fn() }));
		Reflect.set(window, 'showSaveFilePicker', picker);

		const pending = await Effect.runPromise(
			startSaveFilePicker('likes-to-go-2026-08-31.json'),
		);

		expect(picker).toHaveBeenCalledTimes(1);
		expect(pending.promise).toBeInstanceOf(Promise);
	});

	it('startSaveFilePicker forwards an abort signal to the picker', async () => {
		const picker = vi.fn(() => Promise.resolve({ createWritable: vi.fn() }));
		Reflect.set(window, 'showSaveFilePicker', picker);
		const controller = new AbortController();

		await Effect.runPromise(
			startSaveFilePicker('likes-to-go-2026-08-31.json', controller.signal),
		);

		expect(picker).toHaveBeenCalledWith(
			expect.objectContaining({ signal: controller.signal }),
		);
	});

	it('awaitSaveFilePicker maps AbortError to SaveFilePickerCancelled', async () => {
		const abort = new DOMException('The user aborted a request.', 'AbortError');
		const result = await Effect.runPromiseExit(
			awaitSaveFilePicker({ promise: Promise.reject(abort) }),
		);

		expect(result._tag).toBe('Failure');
	});

	it('writeTextFile writes the string and closes', async () => {
		const write = vi.fn(() => Promise.resolve(undefined));
		const close = vi.fn(() => Promise.resolve(undefined));
		const handle = {
			createWritable: () => Promise.resolve({ write, close }),
		};

		await Effect.runPromise(writeTextFile(handle, '{"ok":true}'));

		expect(write).toHaveBeenCalledWith('{"ok":true}');
		expect(close).toHaveBeenCalledTimes(1);
	});
});
