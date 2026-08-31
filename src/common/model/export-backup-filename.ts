export function exportBackupFilename(now: Date, extension: string): string {
	return `likes-to-go-${now.toISOString().slice(0, 10)}.${extension}`;
}
