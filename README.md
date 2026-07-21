# ❤️ Likes to Go

**Hi — I'm Beat.** I'm a little heart who helps you export your SoundCloud likes as a clean JSON backup. No accounts, no servers, no audio downloaded. Your data, to go.

![Beat](docs/images/beat-intro.png)

## 🎵 What it does

You have hundreds (or thousands) of liked tracks on SoundCloud. I'll save them as a clean JSON file — a personal backup of your music library.

- Open your SoundCloud likes page
- Summon me and hit **Start export**
- Get a file with every track: title, artist, URL, artwork, and more

That's it. Your likes, your file, your hard drive.

## 📥 Install

### Chrome Web Store

[Install from the Chrome Web Store](https://chromewebstore.google.com/detail/likes-to-go/bleniiemffekgejceicenjdomcapbhmg)

### Dev mode (sideload)

1. Download the latest `.zip` from [Releases](https://github.com/ZUGAZ/likes-to-go/releases).
2. Unzip it.
3. Open `chrome://extensions/` and enable **Developer mode**.
4. Click **Load unpacked** and select the unzipped folder.

## 🚀 Usage

1. Open your SoundCloud likes page (or any tab — see below).
2. Click the Likes to Go toolbar icon.
   - On a **SoundCloud** tab, I appear **in-page** on the likes page.
   - On **other** tabs, the toolbar icon opens the **popup** — same me, same buttons.
3. Click **Start export**.
4. Wait until I'm done, then click **Download backup** to save your file.

## Supported SoundCloud views

I can export from your SoundCloud likes page when it's shown as **Badges** or **List** view. Use SoundCloud's view switcher on your likes page to pick either layout before you start.

If the export fails because the page layout isn't recognized, switch to the other supported view and try again. Other likes page layouts aren't supported in this release.

## Output format

Here's what I save today — the export payload follows `format_version: 1`:

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

Field notes:

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

### Field availability by view

| Field              | Badges view | List view         |
| ------------------ | ----------- | ----------------- |
| title, artist, url | Yes         | Yes               |
| artwork_url        | Yes         | Yes (when loaded) |
| user_url           | Yes         | Yes               |
| genre              | —           | Yes (when shown)  |
| tags               | —           | Yes (when shown)  |
| playback_count     | —           | Yes (when shown)  |
| likes_count        | —           | Yes (when shown)  |

## Privacy

- Your data stays in your browser session — I never send it anywhere.
- No accounts, no sign-up, and no external backend.
- No analytics or telemetry.
- Only track metadata goes into your backup; audio is never downloaded.

## Support

Need a hand or found a snag while exporting? [Open a GitHub issue](https://github.com/ZUGAZ/likes-to-go/issues/new) — I'll be glad you did.

## License

Released under [MIT](LICENSE).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture, coding standards, and development workflow.

Disclaimer: This extension is for personal data backup. You are responsible for your own compliance with SoundCloud's Terms of Use.
