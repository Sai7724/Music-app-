// Shared types for all music sources

export type SearchResult = {
  id: string; // provider:id  e.g. "youtube:dQw4w9WgXcQ"
  title: string;
  duration: number | null; // seconds
  thumbnail: string | null;
  artist: string | null;
  provider: 'youtube';
};

export type StreamInfo = {
  stream_url: string;
  duration: number | null; // ms
  title: string | null;
  provider: string;
};
