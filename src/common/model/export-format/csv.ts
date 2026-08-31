import type { ExportFormatId } from '@/common/model/export-format/export-format-id';
import { escapeCsvField } from '@/common/model/export-format/escape-csv-field';
import type { SaveFilePickerType } from '@/common/model/export-format/save-file-picker-type';
import type { Track } from '@/common/model/track';

const CSV_FORMAT_ID: ExportFormatId = 'csv';

const CSV_PICKER_TYPES: readonly SaveFilePickerType[] = [
	{
		description: 'CSV export',
		accept: { 'text/csv': ['.csv'] },
	},
];

const CSV_HEADER = 'title,artist';

export function renderCsvExport(tracks: readonly Track[]): string {
	const rows = tracks.map(
		(track) => `${escapeCsvField(track.title)},${escapeCsvField(track.artist)}`,
	);
	return [CSV_HEADER, ...rows].join('\n');
}

export const csvExportFormat = {
	id: CSV_FORMAT_ID,
	label: 'CSV',
	extension: 'csv',
	worksWith: 'Title and artist — Soundiiz, Sockseek, TuneMyMusic.',
	pickerTypes: CSV_PICKER_TYPES,
	render: renderCsvExport,
};
