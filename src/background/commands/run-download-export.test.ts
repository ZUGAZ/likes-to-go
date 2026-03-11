import { Effect } from 'effect';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { buildExportPayload } from '@/common/model/exporter';
import { downloadJson } from '@/common/infrastructure/chrome-downloads';
import { runDownloadExport } from '@/background/commands/run-download-export';
import { DownloadFailed } from '@/common/model/collection/events/download-failed';

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

		const result = await Effect.runPromiseExit(runDownloadExport(tracks));

		expect(buildExportPayload).toHaveBeenCalledWith({ tracks: [] });
		expect(downloadJson).toHaveBeenCalledWith(
			JSON.stringify({ mock: 'payload' }),
		);
		expect(result._tag).toBe('Success');
	});

	it('fails with DownloadFailed on download error', async () => {
		const error = new Error('boom');
		(downloadJson as unknown as vi.Mock).mockRejectedValueOnce(error);

		const result = await Effect.runPromiseExit(runDownloadExport([]));

		expect(result._tag).toBe('Failure');
		if (result._tag === 'Failure') {
			const failure = result.cause as any;
			const errorValue = (failure as any).error ?? failure;
			expect(errorValue).toEqual(DownloadFailed({ message: 'boom' }));
		}
	});
});
