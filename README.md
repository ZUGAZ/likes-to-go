# ❤️ Likes to Go

**Your music taste in a file**

A Chrome extension that saves your SoundCloud likes as a file. No accounts, no servers, no audio downloaded. Your data, to go.

## 🎵 What it does

You have hundreds (or thousands) of liked tracks on SoundCloud. This extension lets you save them as a clean JSON file -- a personal backup of your music library.

- Open your SoundCloud likes page
- Hit the button
- Get a file with every track: title, artist, URL, artwork, and more

That's it. Your likes, your file, your hard drive.

## 📥 Install

### Chrome Web Store

Coming soon. The listing link will be added here when published.

### Dev mode (sideload)

1. Download the latest `.zip` from [Releases](https://github.com/ZUGAZ/likes-to-go/releases).
2. Unzip it.
3. Open `chrome://extensions/` and enable **Developer mode**.
4. Click **Load unpacked** and select the unzipped folder.

## 🚀 Usage

1. Click the Likes to Go toolbar icon.
2. Click **❤️ Likes to go**.
3. Wait for collection to complete, then click **💚 Ready to go** to download.

## Screenshots

### Initial

![Popup initial state](docs/screenshots/popup-initial.svg)

### Processing

![Popup processing state](docs/screenshots/popup-processing.svg)

### Done

![Popup done state](docs/screenshots/popup-done.svg)

## Output format

The export payload currently follows `format_version: 1`:

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

## Privacy

- Your data stays in your browser session.
- No accounts, no sign-up flow, and no external backend.
- No analytics or telemetry.
- Only track metadata is exported; audio is never downloaded.

## License

Released under [MIT](LICENSE).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture, coding standards, and development workflow.

Disclaimer: This extension is for personal data backup. You are responsible for your own compliance with SoundCloud's Terms of Use.
