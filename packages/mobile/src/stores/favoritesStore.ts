/**
 * Mobile favorites store — same logic, MobileStore instead of LazyStore.
 */
import { create } from 'zustand';

import type { AlbumRef, ArtistRef, ProviderRef, Track } from '@nuclearplayer/model';
import type { FavoriteEntry, FavoritesData } from '@nuclearplayer/plugin-sdk';

import { MobileStore } from '../native/storage';

export type { FavoriteEntry, FavoritesData };

const store = new MobileStore('favorites');

type RefWithSource = { source: ProviderRef };
type FavoritesKey = 'tracks' | 'albums' | 'artists';

type FavoritesState = FavoritesData & {
  loaded: boolean;
  loadFromDisk: () => Promise<void>;
  addTrack: (track: Track) => Promise<void>;
  removeTrack: (source: ProviderRef) => Promise<void>;
  isTrackFavorite: (source: ProviderRef) => boolean;
  addAlbum: (ref: AlbumRef) => Promise<void>;
  removeAlbum: (source: ProviderRef) => Promise<void>;
  isAlbumFavorite: (source: ProviderRef) => boolean;
  addArtist: (ref: ArtistRef) => Promise<void>;
  removeArtist: (source: ProviderRef) => Promise<void>;
  isArtistFavorite: (source: ProviderRef) => boolean;
};

const matchesSource = (a: ProviderRef, b: ProviderRef) =>
  a.provider === b.provider && a.id === b.id;

const saveToDisk = async () => {
  const s = useFavoritesStore.getState();
  await store.set('favorites.tracks', s.tracks);
  await store.set('favorites.albums', s.albums);
  await store.set('favorites.artists', s.artists);
  await store.save();
};

const getList = <T extends RefWithSource>(key: FavoritesKey) =>
  useFavoritesStore.getState()[key] as unknown as FavoriteEntry<T>[];

const createAdd =
  <T extends RefWithSource>(key: FavoritesKey) =>
  async (ref: T): Promise<void> => {
    const list = getList<T>(key);
    if (list.some((e) => matchesSource(e.ref.source, ref.source))) return;
    const entry: FavoriteEntry<T> = { ref, addedAtIso: new Date().toISOString() };
    useFavoritesStore.setState({ [key]: [...list, entry] });
    await saveToDisk();
  };

const createRemove =
  <T extends RefWithSource>(key: FavoritesKey) =>
  async (source: ProviderRef): Promise<void> => {
    const list = getList<T>(key);
    useFavoritesStore.setState({
      [key]: list.filter((e) => !matchesSource(e.ref.source, source)),
    });
    await saveToDisk();
  };

const createIs =
  <T extends RefWithSource>(key: FavoritesKey) =>
  (source: ProviderRef): boolean =>
    getList<T>(key).some((e) => matchesSource(e.ref.source, source));

export const useFavoritesStore = create<FavoritesState>(() => ({
  tracks: [],
  albums: [],
  artists: [],
  loaded: false,

  loadFromDisk: async () => {
    const tracks = (await store.get<FavoriteEntry<Track>[]>('favorites.tracks')) ?? [];
    const albums = (await store.get<FavoriteEntry<AlbumRef>[]>('favorites.albums')) ?? [];
    const artists = (await store.get<FavoriteEntry<ArtistRef>[]>('favorites.artists')) ?? [];
    useFavoritesStore.setState({ tracks, albums, artists, loaded: true });
  },

  addTrack: createAdd<Track>('tracks'),
  removeTrack: createRemove<Track>('tracks'),
  isTrackFavorite: createIs<Track>('tracks'),

  addAlbum: createAdd<AlbumRef>('albums'),
  removeAlbum: createRemove<AlbumRef>('albums'),
  isAlbumFavorite: createIs<AlbumRef>('albums'),

  addArtist: createAdd<ArtistRef>('artists'),
  removeArtist: createRemove<ArtistRef>('artists'),
  isArtistFavorite: createIs<ArtistRef>('artists'),
}));

export const initializeFavoritesStore = async (): Promise<void> => {
  await useFavoritesStore.getState().loadFromDisk();
};
