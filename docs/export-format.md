# 📄 Export format

Likes to Go saves your backup as JSON. The export payload follows `format_version: 1`.

## 🧾 Example file

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
			"user_url": "https://soundcloud.com/artist",
			"genre": "Electronic",
			"tags": ["Electronic"],
			"playback_count": 12500,
			"likes_count": 890
		},
		{
			"title": "Second Track",
			"artist": "Another Artist",
			"url": "https://soundcloud.com/another/second-track"
		}
	]
}
```

## 🏷️ Field notes

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
  - `genre` (optional string)
  - `tags` (optional string array)
  - `playback_count` (optional number)
  - `likes_count` (optional number)

**Optional track fields** (`genre`, `tags`, `playback_count`, `likes_count`) may be omitted per track. They appear when you export from **List view** and SoundCloud shows that metadata on the page. **Badges view** exports core fields only and omits these keys.

**Not exported:** track duration and liked-at timestamp are not available from either supported view in the current release.

## 📊 Field availability by view

| Field              | Badges view | List view         |
| ------------------ | ----------- | ----------------- |
| title, artist, url | Yes         | Yes               |
| artwork_url        | Yes         | Yes (when loaded) |
| user_url           | Yes         | Yes               |
| genre              | —           | Yes (when shown)  |
| tags               | —           | Yes (when shown)  |
| playback_count     | —           | Yes (when shown)  |
| likes_count        | —           | Yes (when shown)  |
