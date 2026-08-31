import { errorToReason } from '@/common/model/error-to-reason';
import { Data, Effect } from 'effect';

export class SaveFilePickerUnavailable extends Data.TaggedError(
	'SaveFilePickerUnavailable',
)<{
	readonly reason: string;
}> {}

export class SaveFilePickerCancelled extends Data.TaggedError(
	'SaveFilePickerCancelled',
)<{
	readonly reason: string;
}> {}

export class SaveFileWriteFailed extends Data.TaggedError(
	'SaveFileWriteFailed',
)<{
	readonly reason: string;
}> {}

export interface SaveFileHandle {
	readonly createWritable: () => Promise<SaveFileWritable>;
}

interface SaveFileWritable {
	readonly write: (data: string) => Promise<void>;
	readonly close: () => Promise<void>;
}

function isAbortError(error: unknown): boolean {
	return error instanceof Error && error.name === 'AbortError';
}

function isSaveFileWritable(value: unknown): value is SaveFileWritable {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	if (!('write' in value) || !('close' in value)) {
		return false;
	}

	return typeof value.write === 'function' && typeof value.close === 'function';
}

function isSaveFileHandle(value: unknown): value is SaveFileHandle {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	if (!('createWritable' in value)) {
		return false;
	}

	return typeof value.createWritable === 'function';
}

function isShowSaveFilePickerFn(value: unknown): value is (
	this: Window,
	options: {
		readonly suggestedName: string;
		readonly signal?: AbortSignal;
		readonly types: ReadonlyArray<{
			readonly description: string;
			readonly accept: { readonly 'application/json': readonly ['.json'] };
		}>;
	},
) => unknown {
	return typeof value === 'function';
}

function callShowSaveFilePicker(
	suggestedName: string,
	signal: AbortSignal | undefined,
): Promise<unknown> {
	const picker: unknown = Reflect.get(window, 'showSaveFilePicker');
	if (!isShowSaveFilePickerFn(picker)) {
		throw new Error('Save file picker is not available');
	}

	const result: unknown = picker.call(window, {
		suggestedName,
		...(signal === undefined ? {} : { signal }),
		types: [
			{
				description: 'JSON backup',
				accept: { 'application/json': ['.json'] },
			},
		],
	});

	if (!(result instanceof Promise)) {
		throw new Error('Save file picker did not return a promise');
	}

	return result;
}

export interface PendingSaveFilePicker {
	readonly promise: Promise<unknown>;
}

/**
 * Opens the save picker in the current user-gesture turn.
 * Returns the picker promise without awaiting it so callers can message
 * the background while the dialog is open.
 */
export function startSaveFilePicker(
	suggestedName: string,
	signal?: AbortSignal,
): Effect.Effect<PendingSaveFilePicker, SaveFilePickerUnavailable> {
	return Effect.try({
		try: () => ({ promise: callShowSaveFilePicker(suggestedName, signal) }),
		catch: (error: unknown) =>
			new SaveFilePickerUnavailable({ reason: errorToReason(error) }),
	});
}

export function awaitSaveFilePicker(
	pending: PendingSaveFilePicker,
): Effect.Effect<
	SaveFileHandle,
	SaveFilePickerCancelled | SaveFilePickerUnavailable
> {
	return Effect.tryPromise({
		try: async () => {
			const handle: unknown = await pending.promise;
			if (!isSaveFileHandle(handle)) {
				throw new Error('Save file picker returned an unexpected handle');
			}
			return handle;
		},
		catch: (error: unknown) => {
			if (isAbortError(error)) {
				return new SaveFilePickerCancelled({
					reason: 'User cancelled the save dialog',
				});
			}
			return new SaveFilePickerUnavailable({ reason: errorToReason(error) });
		},
	});
}

export function writeTextFile(
	handle: SaveFileHandle,
	contents: string,
): Effect.Effect<void, SaveFileWriteFailed> {
	return Effect.tryPromise({
		try: async () => {
			const writableUnknown: unknown = await handle.createWritable();
			if (!isSaveFileWritable(writableUnknown)) {
				throw new Error('Save file handle did not provide a writable');
			}
			await writableUnknown.write(contents);
			await writableUnknown.close();
		},
		catch: (error: unknown) =>
			new SaveFileWriteFailed({ reason: errorToReason(error) }),
	});
}
