import { describe, expect, it } from "vitest";
import {
	getTracksFromRoot,
	parseDurationToMs,
} from "@/common/infrastructure/dom-reader";

function createFixture(innerHTML: string): Element {
	const root = document.createElement("div");
	root.className = "lazyLoadingList__list";
	root.innerHTML = innerHTML;
	return root;
}

describe("parseDurationToMs", () => {
	it("parses mm:ss to milliseconds", () => {
		expect(parseDurationToMs("3:45")).toBe(225_000);
		expect(parseDurationToMs("0:30")).toBe(30_000);
	});

	it("parses h:mm:ss to milliseconds", () => {
		expect(parseDurationToMs("1:23:45")).toBe(
			1 * 3600 * 1000 + 23 * 60 * 1000 + 45 * 1000,
		);
	});

	it("parses single number as seconds", () => {
		expect(parseDurationToMs("90")).toBe(90_000);
	});

	it("returns 0 for empty or invalid", () => {
		expect(parseDurationToMs("")).toBe(0);
		expect(parseDurationToMs("  ")).toBe(0);
		expect(parseDurationToMs("ab:cd")).toBe(0);
	});
});

describe("getTracksFromRoot", () => {
	const baseUrl = "https://soundcloud.com";

	it("returns empty array when no cards", () => {
		const root = createFixture("<p>no tracks</p>");
		expect(getTracksFromRoot(root, baseUrl)).toEqual([]);
	});

	it("parses cards with soundList__item and soundTitle/duration selectors", () => {
		const root = createFixture(`
			<ul class="soundList">
				<li class="soundList__item">
					<div class="soundTitle">
						<a class="soundTitle__link" href="/artist-one/track-a">Track A</a>
						<span class="soundTitle__title">Track A</span>
						<span class="soundTitle__username">Artist One</span>
					</div>
					<span class="playbackTimeline__duration">2:30</span>
				</li>
				<li class="soundList__item">
					<div class="soundTitle">
						<a href="/artist-two/track-b">Track B</a>
						<span class="soundTitle__title">Track B</span>
						<span class="soundTitle__username">Artist Two</span>
					</div>
					<span class="playbackTimeline__duration">1:00</span>
				</li>
			</ul>
		`);
		const tracks = getTracksFromRoot(root, baseUrl);
		expect(tracks).toHaveLength(2);
		expect(tracks[0]).toEqual({
			title: "Track A",
			artist: "Artist One",
			url: "https://soundcloud.com/artist-one/track-a",
			duration_ms: 150_000,
		});
		expect(tracks[1]).toEqual({
			title: "Track B",
			artist: "Artist Two",
			url: "https://soundcloud.com/artist-two/track-b",
			duration_ms: 60_000,
		});
	});

	it("skips cards without title or url", () => {
		const root = createFixture(`
			<ul class="soundList">
				<li class="soundList__item">
					<span class="soundTitle__title">No link</span>
					<span class="soundTitle__username">Who</span>
					<a href="">empty href</a>
					<span class="playbackTimeline__duration">0:00</span>
				</li>
				<li class="soundList__item">
					<a href="/artist/track">Link only</a>
					<span class="soundTitle__title"></span>
					<span class="soundTitle__username">Artist</span>
					<span class="playbackTimeline__duration">1:00</span>
				</li>
			</ul>
		`);
		const tracks = getTracksFromRoot(root, baseUrl);
		expect(tracks).toHaveLength(0);
	});

	it("resolves relative hrefs with baseUrl", () => {
		const root = createFixture(`
			<li class="soundList__item">
				<a href="/user/song">Song</a>
				<span class="soundTitle__title">Song</span>
				<span class="soundTitle__username">User</span>
				<span class="playbackTimeline__duration">3:00</span>
			</li>
		`);
		const tracks = getTracksFromRoot(root, baseUrl);
		expect(tracks[0]?.url).toBe("https://soundcloud.com/user/song");
	});
});
