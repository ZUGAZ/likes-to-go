import { Schema } from 'effect';

export const ExportFormatIdSchema = Schema.Literal('json', 'csv');

export type ExportFormatId = Schema.Schema.Type<typeof ExportFormatIdSchema>;

export function resolveExportFormatId(input: {
	readonly format?: ExportFormatId | undefined;
}): ExportFormatId {
	return input.format ?? 'json';
}
