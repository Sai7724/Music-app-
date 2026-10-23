# 🎵 Music App

A free music streaming app for **iOS** and **Android**. Search any song, build playlists, and listen — no ads, no tracking.

---

## ✨ Features

- 🔍 Search for any song, artist, or album
- ▶️ Stream music instantly
- 📋 Queue songs and manage playback
- ❤️ Save your favorite tracks, albums, and artists
- 📂 Create and manage playlists
- 🕓 View your listening history
- 🎤 View lyrics while listening
- 🔀 Shuffle, repeat, and crossfade support
- 🌙 Beautiful dark theme

---

## 📥 Download & Install

### Android

1. **Download the APK** from the [Releases page](https://github.com/nukeop/nuclear/releases)
   - Look for a file ending in `.apk`

2. **Allow installs from unknown sources**
   - Go to **Settings → Security** (or **Settings → Apps → Special app access**)
   - Enable **Install unknown apps** for your browser or file manager

3. **Open the APK file** from your Downloads folder and tap **Install**

4. **Open Music App** — you're ready to go! 🎉

---

### iOS

> iOS requires building from source via Xcode (App Store release coming soon).

1. Make sure you have a Mac with **Xcode** installed
2. Follow the [Developer Setup](#developer-setup) steps below
3. Connect your iPhone and run the app via Xcode

---

## 🛠️ Developer Setup

Want to build and run the app yourself? Follow these steps.

### What you need

| Tool | Version |
|------|---------|
| Node.js | 22 or newer |
| pnpm | 9 or newer |
| Android Studio | For Android |
| Xcode (macOS only) | For iOS |

---

### Step 1 — Clone the project

```bash
git clone https://github.com/nukeop/nuclear.git
cd nuclear
```

### Step 2 — Install dependencies

```bash
pnpm install
```

### Step 3 — Set up the stream server

The app needs a backend to stream music. Deploy it free on [Render](https://render.com):

1. Go to [render.com](https://render.com) and create a free account
2. Create a **New Web Service** and connect your GitHub repo
3. Set the root directory to `packages/stream-server`
4. Use these settings:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `node dist/index.js`
5. Deploy and copy the URL (e.g. `https://your-app.onrender.com`)

### Step 4 — Configure the app

```bash
cd packages/mobile
cp .env.example .env
```

Open `.env` and set your Render URL:

```
VITE_STREAM_SERVER_URL=https://your-app.onrender.com
```

### Step 5 — Build the app

```bash
pnpm --filter @nuclearplayer/mobile build
```

### Step 6 — Run on Android

```bash
cd packages/mobile
pnpm cap add android      # Only needed the first time
pnpm cap sync
pnpm cap open android     # Opens Android Studio
```

In Android Studio, click ▶️ **Run** to install on your device or emulator.

### Step 7 — Run on iOS *(macOS only)*

```bash
cd packages/mobile
pnpm cap add ios          # Only needed the first time
pnpm cap sync
pnpm cap open ios         # Opens Xcode
```

In Xcode, select your device and click ▶️ **Run**.

---

## 🔄 Live Reload (for development)

```bash
# Terminal 1 — start the dev server
pnpm --filter @nuclearplayer/mobile dev

# Terminal 2 — run on device with live reload
cd packages/mobile
pnpm cap run android
# or
pnpm cap run ios
```

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| App won't install on Android | Enable "Install unknown apps" in Settings |
| No music plays | Check that your stream server URL is set correctly in `.env` |
| Build fails | Make sure Node.js 22+ and pnpm 9+ are installed |
| iOS build fails | Xcode must be installed and you need an Apple Developer account |

---

## 📄 License

AGPL-3.0 — free and open source. See [LICENSE](../../LICENSE).
