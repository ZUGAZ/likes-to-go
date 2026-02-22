import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buildExportPayload } from "@/common/model/exporter";
import type { Track } from "@/common/model/track";

function validTrack(overrides?: Partial<Track>): Track {
	return {
		title: "Track",
		artist: "Artist",
		url: new URL("https://soundcloud.com/artist/track"),
		duration_ms: 180000,
		...overrides,
	};
}

describe("buildExportPayload", () => {
	it("output has format_version 1", () => {
		const payload = buildExportPayload({ tracks: [] });
		expect(payload.format_version).toBe(1);
	});

	it("output has exported_at as ISO string", () => {
		const payload = buildExportPayload({ tracks: [] });
		expect(typeof payload.exported_at).toBe("string");
		expect(payload.exported_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});

	it("output has default source_url", () => {
		const payload = buildExportPayload({ tracks: [] });
		expect(payload.source_url).toBe("https://soundcloud.com/you/likes");
	});

	it("output respects provided source_url and exported_at", () => {
		const payload = buildExportPayload({
			tracks: [],
			source_url: "https://example.com",
			exported_at: "2024-01-15T12:00:00.000Z",
		});
		expect(payload.source_url).toBe("https://example.com");
		expect(payload.exported_at).toBe("2024-01-15T12:00:00.000Z");
	});

	it("track_count equals tracks length", () => {
		const tracks = [validTrack(), validTrack()];
		const payload = buildExportPayload({ tracks });
		expect(payload.track_count).toBe(2);
		expect(payload.tracks).toHaveLength(2);
	});

	it("tracks are serialized with url as string", () => {
		const url = new URL("https://soundcloud.com/u/s");
		const tracks = [validTrack({ url })];
		const payload = buildExportPayload({ tracks });
		expect(payload.tracks[0]).toEqual({
			title: "Track",
			artist: "Artist",
			url: "https://soundcloud.com/u/s",
			duration_ms: 180000,
		});
	});

	it("property: any valid track array yields correct shape and format_version", () => {
		fc.assert(
			fc.property(
				fc.array(
					fc.record({
						title: fc.string(),
						artist: fc.string(),
						url: fc.webUrl(),
						duration_ms: fc.integer({ min: 0, max: 3600000 }),
					}),
					{ maxLength: 50 },
				),
				(records) => {
					const tracks: Track[] = records.map((r) => ({
						...r,
						url: new URL(r.url),
					}));
					const payload = buildExportPayload({ tracks });
					expect(payload.format_version).toBe(1);
					expect(payload.track_count).toBe(tracks.length);
					expect(payload.tracks).toHaveLength(tracks.length);
					expect(typeof payload.exported_at).toBe("string");
					expect(typeof payload.source_url).toBe("string");
					for (const t of payload.tracks) {
						expect(typeof t.title).toBe("string");
						expect(typeof t.artist).toBe("string");
						expect(typeof t.url).toBe("string");
						expect(Number.isInteger(t.duration_ms)).toBe(true);
						expect(t.duration_ms).toBeGreaterThanOrEqual(0);
					}
				},
			),
		);
	});
});
