import type { ExportFormatId } from '@/common/model/export-format/export-format-id';
import type { SaveFilePickerType } from '@/common/model/export-format/save-file-picker-type';
import { buildExportPayload } from '@/common/model/exporter';
import type { Track } from '@/common/model/track';

const JSON_FORMAT_ID: ExportFormatId = 'json';

const JSON_PICKER_TYPES: readonly SaveFilePickerType[] = [
	{
		description: 'JSON backup',
		accept: { 'application/json': ['.json'] },
	},
];

export const jsonExportFormat = {
	id: JSON_FORMAT_ID,
	label: 'JSON',
	extension: 'json',
	worksWith: 'Your full backup — keep it, or drop it in a chat.',
	pickerTypes: JSON_PICKER_TYPES,
	render: (tracks: readonly Track[]) =>
		JSON.stringify(buildExportPayload({ tracks })),
};
