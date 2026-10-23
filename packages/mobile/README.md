# Nuclear Mobile

Capacitor-based mobile app for iOS and Android. Full feature parity with the desktop app.

## Architecture

```
packages/mobile/          ← This package (Capacitor + React)
packages/stream-server/   ← Node.js backend deployed on Render
```

The mobile app replaces all Tauri APIs with:

| Tauri | Mobile |
|---|---|
| `@tauri-apps/plugin-store` | `@capacitor/preferences` via `MobileStore` |
| `@tauri-apps/plugin-fs` | `@capacitor/filesystem` |
| `@tauri-apps/plugin-os` | `@capacitor/device` |
| `ytdlp_search / ytdlp_get_stream` | Render backend API |
| `stream_server` (CORS proxy) | Render `/api/proxy/stream/:url` |
| `discord-rich-presence` | Not available on mobile |
| Window management | Not applicable |

## Setup

### 1. Deploy the stream server to Render

```bash
cd packages/stream-server
# Push to GitHub, then connect to Render as a Web Service
# Build command: npm install && npm run build
# Start command: node dist/index.js
```

### 2. Configure the mobile app

```bash
cd packages/mobile
cp .env.example .env
# Edit .env and set VITE_STREAM_SERVER_URL to your Render URL
```

### 3. Install dependencies

```bash
# From the monorepo root
pnpm install
```

### 4. Build the frontend

```bash
pnpm --filter @nuclearplayer/mobile build
```

### 5. Add native platforms

```bash
cd packages/mobile
pnpm cap add ios      # requires macOS + Xcode
pnpm cap add android  # requires Android Studio
```

### 6. Sync and run

```bash
# Sync web assets to native projects
pnpm cap sync

# Open in IDE
pnpm cap:open:ios      # Opens Xcode
pnpm cap:open:android  # Opens Android Studio
```

## Development (live reload)

```bash
# Terminal 1 — start Vite dev server
pnpm --filter @nuclearplayer/mobile dev

# Terminal 2 — sync and run on device
cd packages/mobile
# Edit capacitor.config.ts and uncomment the server.url line
# pointing to your machine's LAN IP (e.g. http://192.168.1.100:5174)
pnpm cap run android
# or
pnpm cap run ios
```

## Platform notes

See `ios.config.md` and `android.config.md` for platform-specific
Xcode and Android Studio configuration required for background audio.

## Features

- ✅ Search (YouTube via yt-dlp on Render)
- ✅ Stream playback (HLS + direct audio)
- ✅ Queue management (persisted)
- ✅ Favorites (tracks, albums, artists)
- ✅ Playlists (create, manage)
- ✅ Listening history
- ✅ Lyrics (via lyrics.ovh)
- ✅ Settings (shuffle, repeat, crossfade)
- ✅ Full player screen with seek bar
- ✅ Mini player bar
- ✅ Haptic feedback (iOS + Android)
- ✅ Safe area support (iOS notch, Dynamic Island, Android edge-to-edge)
- ✅ Dark theme
