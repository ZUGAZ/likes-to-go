import { exportBackupFilename } from '@/common/model/export-backup-filename';
import { describe, expect, it } from 'vitest';

describe('exportBackupFilename', () => {
	it('uses the UTC calendar date and the given extension', () => {
		expect(
			exportBackupFilename(new Date('2026-08-31T22:15:00.000Z'), 'json'),
		).toBe('likes-to-go-2026-08-31.json');
	});
});
