/**
 * Mobile ytdlp host — talks to the Render backend instead of the local binary.
 * Drop-in replacement for packages/player/src/services/ytdlpHost.ts
 */
import type {
  YtdlpHost,
  YtdlpPlaylistInfo,
  YtdlpSearchResult,
  YtdlpStreamInfo,
} from '@nuclearplayer/plugin-sdk';

import {
  ytdlpGetPlaylist,
  ytdlpGetStream,
  ytdlpSearch,
} from '../native/streamApi';

export const ytdlpHost: YtdlpHost = {
  search: async (query, maxResults): Promise<YtdlpSearchResult[]> => {
    const results = await ytdlpSearch(query, maxResults);
    return results.map((r) => ({
      id: r.id,
      title: r.title,
      duration: r.duration,
      thumbnail: r.thumbnail,
      channel: r.channel ?? r.artist ?? null,
    }));
  },
  getStream: async (url): Promise<YtdlpStreamInfo> => {
    const info = await ytdlpGetStream(url, null);
    return {
      stream_url: info.stream_url,
      duration: info.duration,
      title: info.title,
      container: info.container ?? null,
      codec: info.codec ?? null,
      album: info.album ?? null,
      artists: info.artists ?? [],
      album_artists: info.album_artists ?? [],
      upload_date: info.upload_date ?? null,
    };
  },
  getPlaylist: async (url): Promise<YtdlpPlaylistInfo> => {
    const playlist = await ytdlpGetPlaylist(url);
    return {
      id: playlist.id,
      title: playlist.title,
      entries: playlist.entries.map((e) => ({
        id: e.id,
        title: e.title,
        duration: e.duration,
        thumbnails: e.thumbnails,
        channel: e.channel,
      })),
    };
  },
};
