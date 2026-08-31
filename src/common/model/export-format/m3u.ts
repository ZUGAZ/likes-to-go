import type { ExportFormatId } from '@/common/model/export-format/export-format-id';
import type { SaveFilePickerType } from '@/common/model/export-format/save-file-picker-type';
import type { Track } from '@/common/model/track';

const M3U_FORMAT_ID: ExportFormatId = 'm3u';

const M3U_PICKER_TYPES: readonly SaveFilePickerType[] = [
	{
		description: 'M3U playlist',
		accept: { 'audio/x-mpegurl': ['.m3u'] },
	},
];

const LINE_BREAK = /\r\n|\n|\r/g;

function sanitizeField(value: string): string {
	return value.replace(LINE_BREAK, ' ');
}

function extInfDisplayName(track: Track): string {
	return `${sanitizeField(track.artist)} - ${sanitizeField(track.title)}`;
}

export function renderM3uExport(tracks: readonly Track[]): string {
	const lines = [
		'#EXTM3U',
		...tracks.flatMap((track) => [
			`#EXTINF:-1,${extInfDisplayName(track)}`,
			track.url.toString(),
		]),
	];
	return `${lines.join('\n')}\n`;
}

export const m3uExportFormat = {
	id: M3U_FORMAT_ID,
	label: 'M3U',
	extension: 'm3u',
	worksWith: 'Track links — not a playable stream.',
	pickerTypes: M3U_PICKER_TYPES,
	render: renderM3uExport,
};
