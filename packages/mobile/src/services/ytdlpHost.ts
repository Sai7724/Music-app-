/**
 * Mobile ytdlp host — talks to the Render backend instead of the local binary.
 * Drop-in replacement for packages/player/src/services/ytdlpHost.ts
 */
import type { YtdlpHost } from '@nuclearplayer/plugin-sdk';

import { ytdlpSearch, ytdlpGetStream, ytdlpGetPlaylist } from '../native/streamApi';

export const ytdlpHost: YtdlpHost = {
  search: (query, maxResults) => ytdlpSearch(query, maxResults),
  getStream: (url) => ytdlpGetStream(url, null),
  getPlaylist: (url) => ytdlpGetPlaylist(url),
};
