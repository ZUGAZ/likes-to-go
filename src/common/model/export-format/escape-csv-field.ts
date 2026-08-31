const CSV_FIELD_NEEDS_QUOTES = /[",\r\n]/;

export function escapeCsvField(value: string): string {
	if (!CSV_FIELD_NEEDS_QUOTES.test(value)) {
		return value;
	}
	return `"${value.replaceAll('"', '""')}"`;
}
