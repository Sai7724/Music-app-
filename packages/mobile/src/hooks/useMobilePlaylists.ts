/**
 * Mobile playlist hook — stores playlists in Capacitor Preferences
 * instead of Tauri's filesystem plugin.
 */
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { MobileStore } from '../native/storage';

const store = new MobileStore('playlists');

type PlaylistIndexEntry = {
  id: string;
  name: string;
  trackCount: number;
  createdAtIso: string;
};

type PlaylistItem = {
  id: string;
  title: string;
  artists: string[];
  artworkUrl?: string;
  provider: string;
  providerId: string;
  durationMs?: number;
};

type Playlist = {
  id: string;
  name: string;
  items: PlaylistItem[];
  createdAtIso: string;
};

export function useMobilePlaylists() {
  const [index, setIndex] = useState<PlaylistIndexEntry[]>([]);

  useEffect(() => {
    void store.get<PlaylistIndexEntry[]>('index').then((data) => {
      setIndex(data ?? []);
    });
  }, []);

  const saveIndex = async (newIndex: PlaylistIndexEntry[]) => {
    setIndex(newIndex);
    await store.set('index', newIndex);
    await store.save();
  };

  const createPlaylist = async (name: string): Promise<string> => {
    const id = uuidv4();
    const playlist: Playlist = {
      id,
      name,
      items: [],
      createdAtIso: new Date().toISOString(),
    };
    await store.set(`playlist.${id}`, playlist);
    const newIndex: PlaylistIndexEntry[] = [
      ...index,
      { id, name, trackCount: 0, createdAtIso: playlist.createdAtIso },
    ];
    await saveIndex(newIndex);
    await store.save();
    return id;
  };

  const deletePlaylist = async (id: string): Promise<void> => {
    await store.remove(`playlist.${id}`);
    await saveIndex(index.filter((e) => e.id !== id));
  };

  const getPlaylist = async (id: string): Promise<Playlist | null> => {
    return store.get<Playlist>(`playlist.${id}`);
  };

  const addTracksToPlaylist = async (
    playlistId: string,
    tracks: PlaylistItem[],
  ): Promise<void> => {
    const playlist = await getPlaylist(playlistId);
    if (!playlist) return;
    const updated: Playlist = {
      ...playlist,
      items: [...playlist.items, ...tracks],
    };
    await store.set(`playlist.${playlistId}`, updated);
    await saveIndex(
      index.map((e) =>
        e.id === playlistId ? { ...e, trackCount: updated.items.length } : e,
      ),
    );
    await store.save();
  };

  return {
    index,
    createPlaylist,
    deletePlaylist,
    getPlaylist,
    addTracksToPlaylist,
  };
}
