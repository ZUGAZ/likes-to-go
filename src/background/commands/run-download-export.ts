import { downloadJson } from '@/common/infrastructure/chrome-downloads';
import { DownloadExport, DownloadFailed } from '@/common/model/collection';
import { buildExportPayload } from '@/common/model/exporter';
import type { Track } from '@/common/model/track';
import { Effect } from 'effect';

export function runDownloadExport(
	tracks: readonly Track[],
): Effect.Effect<DownloadExport, DownloadFailed> {
	return Effect.tryPromise({
		try: async () => {
			const payload = buildExportPayload({ tracks });
			await downloadJson(JSON.stringify(payload));
			return DownloadExport();
		},
		catch: (err: unknown) =>
			DownloadFailed({
				message: err instanceof Error ? err.message : String(err),
			}),
	});
}
