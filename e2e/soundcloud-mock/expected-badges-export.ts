import { expect } from '@playwright/test';

import type { ExportPayload } from '@/common/model/exporter';

import { SOUNDCLOUD_LIKES_URL } from './constants';

/**
 * Valid tracks from `tests/fixtures/badges-view.html` as asserted in
 * `src/layout/infrastructure/read-tracks-from-cards.test.ts` (badges-view
 * fixture). Payload keys and optional-field omissions follow
 * `src/common/model/exporter.test.ts`.
 */
const EXPECTED_BADGES_EXPORT_TRACKS: ExportPayload['tracks'] = [
	{
		title: "NKZ 'Run Away' [Rollout Records] *PREMIERE*",
		artist: 'NKZ',
		url: 'https://soundcloud.com/datatransmissiondnb/nkz-run-away-rollout-records',
		user_url: 'https://soundcloud.com/datatransmissiondnb',
		artwork_url:
			'https://i1.sndcdn.com/artworks-QPhQzEwsqobVlxam-cyaOVg-t500x500.png',
	},
	{
		title: 'Bou & Toxinate - Bounce (SHORE REMIX)',
		artist: 'SHORE',
		url: 'https://soundcloud.com/shorednb/bou-toxinate-bounce-shore',
		user_url: 'https://soundcloud.com/shorednb',
		artwork_url:
			'https://i1.sndcdn.com/artworks-xIhS2PjFLHgvS7dP-TciMsw-t500x500.jpg',
	},
	{
		title: "Apple Police 'Those Moves' [Sub-liminal Recordings] *PREMIERE*",
		artist: 'Apple Police',
		url: 'https://soundcloud.com/datatransmissiondnb/apple-police-those-moves-subliminal-recordings',
		user_url: 'https://soundcloud.com/datatransmissiondnb',
		artwork_url:
			'https://i1.sndcdn.com/artworks-cfziaPh9kyH3RUBl-VWi3jw-t500x500.png',
	},
];

export const EXPECTED_VALID_TRACK_COUNT = EXPECTED_BADGES_EXPORT_TRACKS.length;

const V1_TOP_LEVEL_KEYS = [
	'exported_at',
	'format_version',
	'source_url',
	'track_count',
	'tracks',
	'user',
] as const;

/** Same prefix check as `exporter.test.ts` ("output has exported_at as ISO string"). */
const EXPORTED_AT_ISO_PREFIX = /^\d{4}-\d{2}-\d{2}T/;

const OMITTED_TRACK_FIELDS = [
	'genre',
	'tags',
	'playback_count',
	'likes_count',
] as const;

function isNonNullObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
	record: Record<string, unknown>,
	key: string,
): string | undefined {
	const value = record[key];
	return typeof value === 'string' ? value : undefined;
}

function readNumber(
	record: Record<string, unknown>,
	key: string,
): number | undefined {
	const value = record[key];
	return typeof value === 'number' ? value : undefined;
}

function isIsoExportedAt(value: string): boolean {
	if (!EXPORTED_AT_ISO_PREFIX.test(value)) {
		return false;
	}

	return !Number.isNaN(Date.parse(value));
}

export function expectedExportFilenameFromExportedAt(
	exportedAt: string,
): string {
	return `likes-to-go-${exportedAt.slice(0, 10)}.json`;
}

export function assertExpectedBadgesExportPayload(
	decoded: unknown,
): ExportPayload {
	expect(isNonNullObject(decoded)).toBe(true);
	if (!isNonNullObject(decoded)) {
		throw new Error('Export payload must be an object');
	}

	expect(Object.keys(decoded).toSorted()).toEqual([...V1_TOP_LEVEL_KEYS]);

	const formatVersion = readNumber(decoded, 'format_version');
	expect(formatVersion).toBe(1);

	const exportedAt = readString(decoded, 'exported_at');
	expect(typeof exportedAt).toBe('string');
	if (exportedAt === undefined || !isIsoExportedAt(exportedAt)) {
		throw new Error('exported_at must be an ISO-8601 timestamp');
	}

	const sourceUrl = readString(decoded, 'source_url');
	expect(sourceUrl).toBe(SOUNDCLOUD_LIKES_URL);

	const user = readString(decoded, 'user');
	expect(user).toBe('');

	const trackCount = readNumber(decoded, 'track_count');
	expect(trackCount).toBe(EXPECTED_VALID_TRACK_COUNT);

	const tracks = decoded['tracks'];
	expect(Array.isArray(tracks)).toBe(true);
	if (!Array.isArray(tracks)) {
		throw new Error('tracks must be an array');
	}

	expect(tracks).toHaveLength(EXPECTED_VALID_TRACK_COUNT);
	expect(tracks).toEqual([...EXPECTED_BADGES_EXPORT_TRACKS]);

	for (const track of tracks) {
		expect(isNonNullObject(track)).toBe(true);
		if (!isNonNullObject(track)) {
			throw new Error('each track must be an object');
		}

		for (const field of OMITTED_TRACK_FIELDS) {
			expect(field in track).toBe(false);
		}
	}

	return {
		format_version: 1,
		exported_at: exportedAt,
		source_url: SOUNDCLOUD_LIKES_URL,
		user: '',
		track_count: EXPECTED_VALID_TRACK_COUNT,
		tracks: EXPECTED_BADGES_EXPORT_TRACKS,
	};
}
