# 📄 Export format

When I'm done, pick a format, then download. One collection — changing format does not collect again. JSON is the full backup. CSV, Text, and M3U are slimmer files over the same tracks.

## 📁 Filename

`likes-to-go-YYYY-MM-DD.{ext}` — `json`, `csv`, `txt`, or `m3u`.

## 🗂️ Formats at a glance

| Format | Body                  | Works with                                          |
| ------ | --------------------- | --------------------------------------------------- |
| JSON   | v1 envelope           | Your full backup — keep it, or drop it in a chat.   |
| CSV    | `title,artist`        | Title and artist — Soundiiz, Sockseek, TuneMyMusic. |
| Text   | `Artist - Title`      | Artist then title — Nicotine+, Sockseek, Soundiiz.  |
| M3U    | `#EXTM3U` + page URLs | Track links — not a playable stream.                |

Matching in those tools is title and artist. We don't talk to them — you drop the file in yourself.

## 🧾 JSON

Your full backup — keep it, or drop it in a chat.

The payload follows `format_version: 1`.

### 🧾 Example file

```json
{
	"format_version": 1,
	"exported_at": "2026-04-09T10:00:00.000Z",
	"source_url": "https://soundcloud.com/you/likes",
	"user": "myusername",
	"track_count": 2,
	"tracks": [
		{
			"title": "Track Name",
			"artist": "Artist Name",
			"url": "https://soundcloud.com/artist/track-name",
			"artwork_url": "https://i1.sndcdn.com/artworks-example-large.jpg",
			"user_url": "https://soundcloud.com/artist"
		},
		{
			"title": "Second Track",
			"artist": "Another Artist",
			"url": "https://soundcloud.com/another/second-track"
		}
	]
}
```

### 🏷️ Field notes

- `format_version`: schema version for forward compatibility
- `exported_at`: ISO timestamp when the export is created
- `source_url`: source likes page URL
- `user`: SoundCloud username (empty string when not available)
- `track_count`: number of exported tracks
- `tracks`: array of exported track records
  - `title` (string)
  - `artist` (string)
  - `url` (string)
  - `artwork_url` (optional string)
  - `user_url` (optional string)

Badges and List export the same track fields.

**Not exported:** track duration and liked-at timestamp are not available from either supported view in the current release.

### 📊 Field availability by view

| Field              | Badges view | List view         |
| ------------------ | ----------- | ----------------- |
| title, artist, url | Yes         | Yes               |
| artwork_url        | Yes         | Yes (when loaded) |
| user_url           | Yes         | Yes               |

## 📋 CSV

Title and artist — Soundiiz, Sockseek, TuneMyMusic.

Header row is exactly `title,artist`. One data row per track, same order as the collection. No URL column — transfer tools treat a `url` field as a catalog id, not a SoundCloud page.

```csv
title,artist
Track Name,Artist Name
Second Track,Another Artist
```

RFC 4180: fields with a comma, quote, or line break are quoted; `"` becomes `""`. UTF-8, no BOM.

## 📃 Text

Artist then title — Nicotine+, Sockseek, Soundiiz.

One `Artist - Title` line per track (space-hyphen-space). Title and artist only. No URLs. No `s:"…"` prefix.

```text
Artist Name - Track Name
Another Artist - Second Track
```

Sockseek reads this list with `--song`. Matching is title and artist via your own tools.

## 🔗 M3U

Track links — not a playable stream.

Extended M3U: `#EXTM3U`, then `#EXTINF:-1,Artist - Title` and the SoundCloud page URL. A bookmark list — not a playable stream.

```m3u
#EXTM3U
#EXTINF:-1,Artist Name - Track Name
https://soundcloud.com/artist/track-name
#EXTINF:-1,Another Artist - Second Track
https://soundcloud.com/another/second-track
```

Duration is always `-1`. These are page links, not audio streams.
