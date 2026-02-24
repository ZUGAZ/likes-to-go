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

	it("parses cards with badgeList__item and playableTile selectors", () => {
		const root = createFixture(`
			<ul class="lazyLoadingList__list">
				<li class="badgeList__item">
					<div class="audibleTile">
						<a class="audibleTile__artworkLink" href="/artist-one/track-a"></a>
						<a class="playableTile__mainHeading">Track A</a>
						<a class="playableTile__usernameHeading">Artist One</a>
					</div>
					<span class="playbackTimeline__duration">2:30</span>
				</li>
				<li class="badgeList__item">
					<div class="audibleTile">
						<a class="audibleTile__artworkLink" href="/artist-two/track-b"></a>
						<a class="playableTile__mainHeading">Track B</a>
						<a class="playableTile__usernameHeading">Artist Two</a>
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
			<ul class="lazyLoadingList__list">
				<li class="badgeList__item">
					<div class="audibleTile">
						<a class="audibleTile__artworkLink" href=""></a>
						<a class="playableTile__mainHeading">No link</a>
						<a class="playableTile__usernameHeading">Who</a>
					</div>
					<span class="playbackTimeline__duration">0:00</span>
				</li>
				<li class="badgeList__item">
					<div class="audibleTile">
						<a class="audibleTile__artworkLink" href="/artist/track"></a>
						<a class="playableTile__mainHeading"></a>
						<a class="playableTile__usernameHeading">Artist</a>
					</div>
					<span class="playbackTimeline__duration">1:00</span>
				</li>
			</ul>
		`);
		const tracks = getTracksFromRoot(root, baseUrl);
		expect(tracks).toHaveLength(0);
	});

	it("resolves relative hrefs with baseUrl", () => {
		const root = createFixture(`
			<li class="badgeList__item">
				<div class="audibleTile">
					<a class="audibleTile__artworkLink" href="/user/song"></a>
					<a class="playableTile__mainHeading">Song</a>
					<a class="playableTile__usernameHeading">User</a>
				</div>
				<span class="playbackTimeline__duration">3:00</span>
			</li>
		`);
		const tracks = getTracksFromRoot(root, baseUrl);
		expect(tracks[0]?.url).toBe("https://soundcloud.com/user/song");
	});
});
