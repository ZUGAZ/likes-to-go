import { renderExportBody } from '@/common/model/export-format/render-export-body';
import { buildExportPayload } from '@/common/model/exporter';
import type { Track } from '@/common/model/track';
import { afterEach, describe, expect, it, vi } from 'vitest';

function validTrack(): Track {
	return {
		title: 'Track',
		artist: 'Artist',
		url: new URL('https://soundcloud.com/artist/track'),
	};
}

describe('renderExportBody', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders JSON as stringified buildExportPayload', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-08-31T12:00:00.000Z'));
		const tracks = [validTrack()];
		expect(renderExportBody('json', tracks)).toBe(
			JSON.stringify(buildExportPayload({ tracks })),
		);
	});
});
