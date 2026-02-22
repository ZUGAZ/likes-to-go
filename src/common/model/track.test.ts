import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { TrackSchema } from "@/common/model/track";

describe("TrackSchema", () => {
	it("decodes valid object with url string to Track", () => {
		const raw = {
			title: "Song",
			artist: "Artist",
			url: "https://soundcloud.com/artist/song",
			duration_ms: 180000,
		};
		const decoded = Schema.decodeUnknownSync(TrackSchema)(raw);
		expect(decoded.title).toBe("Song");
		expect(decoded.artist).toBe("Artist");
		expect(decoded.url).toBeInstanceOf(URL);
		expect(decoded.url.toString()).toBe("https://soundcloud.com/artist/song");
		expect(decoded.duration_ms).toBe(180000);
	});

	it("decodes zero duration", () => {
		const raw = {
			title: "X",
			artist: "Y",
			url: "https://example.com/track",
			duration_ms: 0,
		};
		const decoded = Schema.decodeUnknownSync(TrackSchema)(raw);
		expect(decoded.duration_ms).toBe(0);
	});

	it("rejects invalid url", () => {
		const raw = {
			title: "Song",
			artist: "Artist",
			url: "not-a-url",
			duration_ms: 100,
		};
		expect(() => Schema.decodeUnknownSync(TrackSchema)(raw)).toThrow();
	});

	it("rejects negative duration", () => {
		const raw = {
			title: "Song",
			artist: "Artist",
			url: "https://soundcloud.com/a/b",
			duration_ms: -1,
		};
		expect(() => Schema.decodeUnknownSync(TrackSchema)(raw)).toThrow();
	});

	it("rejects missing required fields", () => {
		expect(() =>
			Schema.decodeUnknownSync(TrackSchema)({ title: "X" }),
		).toThrow();
	});
});
