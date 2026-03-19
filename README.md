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

_Coming soon._

### Dev mode (sideloading)

1. Download the latest `.zip` from [Releases](https://github.com/ZUGAZ/likes-to-go/releases)
2. Unzip it
3. Open `chrome://extensions/` and enable **Developer mode**
4. Click **Load unpacked** and select the unzipped folder

## 🚀 Usage

1. Go to [soundcloud.com/you/likes](https://soundcloud.com/you/likes) (you need to be logged in)
2. Click the Likes to Go extension icon
3. Hit **Export** and wait for the magic ☕

_Screenshots coming soon._

## 📄 Output format

Your likes are saved as a JSON file with this structure:

```json
{
	"format_version": 1,
	"exported_at": "2026-02-18T12:00:00Z",
	"source_url": "https://soundcloud.com/you/likes",
	"user": "username",
	"track_count": 342,
	"tracks": [
		{
			"title": "Track Name",
			"artist": "Artist Name",
			"user_url": "https://soundcloud.com/artist-name",
			"url": "https://soundcloud.com/artist/track-name",
			"artwork_url": "https://i1.sndcdn.com/artworks-...-large.jpg"
		}
	]
}
```

`format_version` allows future schema changes without breaking your tools.

## 🔒 Privacy

- **No data leaves your browser.** Everything runs locally in your Chrome session.
- **No accounts.** No sign-up, no login, no API keys.
- **No servers.** Zero network requests to anywhere except SoundCloud itself.
- **No analytics.** No tracking, no telemetry, no "anonymous usage data."
- **No audio.** Only metadata (titles, artists, URLs). No audio is accessed or downloaded.

## ⚖️ License

[MIT](LICENSE) -- do whatever you want with it.

**Disclaimer:** This tool is for personal data backup. You are responsible for your own compliance with SoundCloud's Terms of Use.

## 🤝 Contributing

Contributions are welcome! Check out [CONTRIBUTING.md](CONTRIBUTING.md) for architecture, code standards, and how to get started.
