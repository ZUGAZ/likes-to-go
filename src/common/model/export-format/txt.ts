import type { ExportFormatId } from '@/common/model/export-format/export-format-id';
import type { SaveFilePickerType } from '@/common/model/export-format/save-file-picker-type';
import type { Track } from '@/common/model/track';

const TXT_FORMAT_ID: ExportFormatId = 'txt';

const TXT_PICKER_TYPES: readonly SaveFilePickerType[] = [
	{
		description: 'Text',
		accept: { 'text/plain': ['.txt'] },
	},
];

const LINE_BREAK = /\r\n|\n|\r/g;

function sanitizeExportLineField(value: string): string {
	return value.replace(LINE_BREAK, ' ');
}

function formatArtistTitleLine(track: Track): string {
	return `${sanitizeExportLineField(track.artist)} - ${sanitizeExportLineField(track.title)}`;
}

export function renderTxtExport(tracks: readonly Track[]): string {
	if (tracks.length === 0) {
		return '';
	}

	return `${tracks.map(formatArtistTitleLine).join('\n')}\n`;
}

export const txtExportFormat = {
	id: TXT_FORMAT_ID,
	label: 'Text',
	extension: 'txt',
	worksWith: 'Artist then title — Nicotine+, Sockseek, Soundiiz.',
	pickerTypes: TXT_PICKER_TYPES,
	render: renderTxtExport,
};
