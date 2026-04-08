import { Cause, Exit, Option } from 'effect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildExportPayload } from '@/common/model/exporter';
import { downloadJson } from '@/common/infrastructure/chrome-downloads';
import { runDownloadExport } from '@/background/commands/run-download-export';
import { DownloadFailed } from '@/common/model/collection/events/download-failed';
import { runPromiseExitWithSilentLogger } from '@/test/effect-log-test';

vi.mock('@/common/model/exporter', () => ({
	buildExportPayload: vi.fn(() => ({ mock: 'payload' })),
}));

vi.mock('@/common/infrastructure/chrome-downloads', () => ({
	downloadJson: vi.fn(() => Promise.resolve()),
}));

describe('runDownloadExport', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('calls buildExportPayload and downloadJson on success', async () => {
		const tracks = [] as const;

		const result = await runPromiseExitWithSilentLogger(
			runDownloadExport(tracks),
		);

		expect(buildExportPayload).toHaveBeenCalledWith({ tracks: [] });
		expect(downloadJson).toHaveBeenCalledWith(
			JSON.stringify({ mock: 'payload' }),
		);
		expect(result._tag).toBe('Success');
	});

	it('fails with DownloadFailed on download error', async () => {
		const err = new Error('boom');
		vi.mocked(downloadJson).mockRejectedValueOnce(err);

		const result = await runPromiseExitWithSilentLogger(runDownloadExport([]));

		expect(Exit.isFailure(result)).toBe(true);
		if (!Exit.isFailure(result)) return;

		const failure = result.cause.pipe(
			Cause.failureOption,
			Option.getOrUndefined,
		);
		expect(failure).toEqual(
			DownloadFailed({
				message: 'Could not save your export',
				reason: 'boom',
			}),
		);
	});
});
