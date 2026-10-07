import { RpcSchema } from '@effect/rpc';
import { PortCaller } from 'browser-extension-kit/messaging';
import { Equal, Schema } from 'effect';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { COLLECTION_STATUSES } from '@/common/model/collection/collection-status';
import {
	BackgroundRpcs,
	CancelCollection,
	CollectionComplete,
	CollectionError,
	CollectionVisibilityPaused,
	CollectionVisibilityResumed,
	DownloadCancelled,
	DownloadExport,
	DownloadFailed,
	DownloadSucceeded,
	ExportUnavailable,
	LoginRequired,
	RefreshCollectionState,
	StartCollection,
	TracksBatch,
	WatchCollectionState,
} from '@/common/model/messaging/background-rpcs';
import { TrackSchema } from '@/common/model/track';

const roundTrip =
	<A, I>(schema: Schema.Schema<A, I>) =>
	(value: A): A => {
		const encoded: unknown = JSON.parse(
			JSON.stringify(Schema.encodeSync(schema)(value)),
		);
		return Schema.decodeUnknownSync(schema)(encoded);
	};

const backgroundRpcTags = [
	'StartCollection',
	'CancelCollection',
	'DownloadExport',
	'DownloadSucceeded',
	'DownloadCancelled',
	'DownloadFailed',
	'RefreshCollectionState',
	'WatchCollectionState',
	'TracksBatch',
	'CollectionComplete',
	'CollectionVisibilityPaused',
	'CollectionVisibilityResumed',
	'CollectionError',
	'LoginRequired',
];

const voidPayloadRpcs = [
	StartCollection,
	CancelCollection,
	DownloadSucceeded,
	DownloadCancelled,
	RefreshCollectionState,
	WatchCollectionState,
	CollectionComplete,
	CollectionVisibilityPaused,
	CollectionVisibilityResumed,
];

/** Wire-format raw track (string url). Optional fields omitted when absent. */
const rawTrack = fc
	.record({
		title: fc.string({ minLength: 1 }),
		artist: fc.string({ minLength: 1 }),
		url: fc.webUrl(),
		artwork_url: fc.option(fc.webUrl(), { nil: undefined }),
		user_url: fc.option(fc.webUrl(), { nil: undefined }),
	})
	.map(({ artwork_url, user_url, ...base }) => ({
		...base,
		...(artwork_url !== undefined && { artwork_url }),
		...(user_url !== undefined && { user_url }),
	}));

const tracksBatchPayload = fc.record({
	tracks: fc
		.array(rawTrack)
		.map((tracks) =>
			tracks.map((track) => Schema.decodeUnknownSync(TrackSchema)(track)),
		),
	skippedTrackCount: fc.nat(),
});

const failureReport = fc.record({
	message: fc.string(),
	reason: fc.string(),
});

describe('BackgroundRpcs', () => {
	it('lists exactly the background procedures, each with PortCaller', () => {
		expect([...BackgroundRpcs.requests.keys()].sort()).toEqual(
			[...backgroundRpcTags].sort(),
		);
		for (const rpc of BackgroundRpcs.requests.values()) {
			expect(rpc.middlewares.has(PortCaller)).toBe(true);
		}
	});

	it('streams only WatchCollectionState and keeps command successes void except DownloadExport', () => {
		for (const [tag, rpc] of BackgroundRpcs.requests) {
			expect(RpcSchema.isStreamSchema(rpc.successSchema)).toBe(
				tag === 'WatchCollectionState',
			);
			if (tag === 'DownloadExport') {
				expect(rpc.successSchema).toBe(Schema.String);
				expect(rpc.errorSchema).toBe(ExportUnavailable);
				continue;
			}
			if (tag === 'WatchCollectionState') {
				expect(rpc.errorSchema).toBe(Schema.Never);
				continue;
			}
			expect(rpc.successSchema).toBe(Schema.Void);
			expect(rpc.errorSchema).toBe(Schema.Never);
		}
	});

	it('uses an empty payload for void commands and fire-and-forget events without fields', () => {
		for (const rpc of voidPayloadRpcs) {
			expect(rpc.payloadSchema).toBe(Schema.Void);
		}
	});

	it('round-trips TracksBatch payloads through JSON', () => {
		fc.assert(
			fc.property(tracksBatchPayload, (payload) => {
				const decoded = roundTrip(TracksBatch.payloadSchema)(payload);
				expect(decoded.skippedTrackCount).toBe(payload.skippedTrackCount);
				expect(decoded.tracks).toHaveLength(payload.tracks.length);
				for (const [index, track] of decoded.tracks.entries()) {
					const original = payload.tracks[index];
					if (original === undefined) {
						throw new Error('missing track');
					}
					expect(track.title).toBe(original.title);
					expect(track.artist).toBe(original.artist);
					expect(track.url.href).toBe(original.url.href);
					expect(track.artwork_url).toBe(original.artwork_url);
					expect(track.user_url).toBe(original.user_url);
				}
			}),
		);
	});

	it('round-trips DownloadExport payloads and export text', () => {
		fc.assert(
			fc.property(fc.constantFrom('json', 'csv', 'txt', 'm3u'), (format) => {
				expect(roundTrip(DownloadExport.payloadSchema)({ format })).toEqual({
					format,
				});
			}),
		);
		fc.assert(
			fc.property(fc.string(), (text) => {
				expect(roundTrip(DownloadExport.successSchema)(text)).toBe(text);
			}),
		);
	});

	it('round-trips failure reports', () => {
		for (const schema of [
			DownloadFailed.payloadSchema,
			CollectionError.payloadSchema,
			LoginRequired.payloadSchema,
		]) {
			fc.assert(
				fc.property(failureReport, (payload) => {
					expect(roundTrip(schema)(payload)).toEqual(payload);
				}),
			);
		}
	});

	it('round-trips ExportUnavailable', () => {
		fc.assert(
			fc.property(fc.constantFrom(...COLLECTION_STATUSES), (status) => {
				const decoded = roundTrip(ExportUnavailable)(
					new ExportUnavailable({ status }),
				);
				expect(Equal.equals(decoded, new ExportUnavailable({ status }))).toBe(
					true,
				);
				expect(decoded).toBeInstanceOf(ExportUnavailable);
			}),
		);
	});

	it('rejects invalid DownloadExport, TracksBatch, and DownloadFailed payloads', () => {
		expect(() =>
			Schema.decodeUnknownSync(DownloadExport.payloadSchema)({
				format: 'xlsx',
			}),
		).toThrow();
		expect(() =>
			Schema.decodeUnknownSync(DownloadExport.payloadSchema)({}),
		).toThrow();
		expect(() =>
			Schema.decodeUnknownSync(TracksBatch.payloadSchema)({
				tracks: [{ title: 'Track', artist: 'Artist', url: 'not-a-url' }],
				skippedTrackCount: 0,
			}),
		).toThrow();
		expect(() =>
			Schema.decodeUnknownSync(DownloadFailed.payloadSchema)({
				message: 'Could not save',
			}),
		).toThrow();
	});
});
