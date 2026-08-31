import { csvExportFormat } from '@/common/model/export-format/csv';
import type { ExportFormatId } from '@/common/model/export-format/export-format-id';
import { jsonExportFormat } from '@/common/model/export-format/json';
import { m3uExportFormat } from '@/common/model/export-format/m3u';
import type { SaveFilePickerType } from '@/common/model/export-format/save-file-picker-type';
import { txtExportFormat } from '@/common/model/export-format/txt';
import type { Track } from '@/common/model/track';
import { Data } from 'effect';

export interface ExportFormatDefinition {
	readonly id: ExportFormatId;
	readonly label: string;
	readonly extension: string;
	readonly worksWith: string;
	readonly pickerTypes: readonly SaveFilePickerType[];
	readonly render: (tracks: readonly Track[]) => string;
}

export class ExportFormatNotFound extends Data.TaggedError(
	'ExportFormatNotFound',
)<{
	readonly formatId: string;
}> {}

const exportFormats: readonly ExportFormatDefinition[] = [
	jsonExportFormat,
	csvExportFormat,
	txtExportFormat,
	m3uExportFormat,
];

export function listExportFormats(): readonly ExportFormatDefinition[] {
	return exportFormats;
}

export function defaultExportFormatId(): ExportFormatId {
	return 'json';
}

export function getExportFormat(id: string): ExportFormatDefinition {
	const format = exportFormats.find((entry) => entry.id === id);
	if (format === undefined) {
		throw new ExportFormatNotFound({ formatId: id });
	}
	return format;
}
