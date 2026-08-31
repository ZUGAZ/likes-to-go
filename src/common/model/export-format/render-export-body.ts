import type { ExportFormatId } from '@/common/model/export-format/export-format-id';
import { getExportFormat } from '@/common/model/export-format/registry';
import type { Track } from '@/common/model/track';

export function renderExportBody(
	formatId: ExportFormatId,
	tracks: readonly Track[],
): string {
	return getExportFormat(formatId).render(tracks);
}
