import { downloadJson } from '@/common/infrastructure/chrome-downloads';
import { catchError } from '@/common/model/catch-error';
import { DownloadExport } from '@/common/model/collection/events/download-export-event';
import { DownloadFailed } from '@/common/model/collection/events/download-failed';
import { buildExportPayload } from '@/common/model/exporter';
import type { Track } from '@/common/model/track';
import { Effect } from 'effect';

export function runDownloadExport(
	tracks: readonly Track[],
): Effect.Effect<DownloadExport, DownloadFailed> {
	const downloadEffect = Effect.tryPromise({
		try: async () => {
			const payload = buildExportPayload({ tracks });
			await downloadJson(JSON.stringify(payload));
			return DownloadExport();
		},
		catch: catchError(DownloadFailed, 'Could not save your export'),
	});

	return Effect.gen(function* () {
		yield* Effect.log('background DownloadExport', {
			tracks: tracks.length,
		});

		const result = yield* downloadEffect;

		return result;
	}).pipe(Effect.withLogSpan('runDownloadExport'));
}
