/**
 * Mobile audio source factory.
 * Replaces the Tauri stream_server proxy with the Render proxy endpoint.
 */
import { AudioSource } from '@nuclearplayer/hifi';
import type { StreamCandidate } from '@nuclearplayer/model';

import { buildProxiedUrl } from '../native/streamApi';

type ResolvedStream = NonNullable<StreamCandidate['stream']>;

/**
 * Maps a container/codec to the MSE codec string the browser needs.
 * Returns null when the format should be played via plain <audio> src.
 */
function toMseCodec(stream: ResolvedStream): string | null {
  const container = stream.container?.toLowerCase() ?? '';
  const codec = stream.codec?.toLowerCase() ?? '';
  const mime = stream.mimeType?.toLowerCase() ?? '';

  // fMP4 / m4a — both use MP4 container, aac or opus inside
  if (container === 'm4a' || mime.includes('audio/mp4')) {
    const c = codec.includes('opus') ? 'opus' : 'mp4a.40.2'; // AAC-LC
    return `audio/mp4; codecs="${c}"`;
  }

  // WebM — opus (from Invidious/yt-dlp bestaudio webm) or vorbis
  if (container === 'webm' || mime.includes('audio/webm')) {
    const c = codec.includes('vorbis') ? 'vorbis' : 'opus';
    return `audio/webm; codecs="${c}"`;
  }

  return null;
}

/**
 * Check if the browser's MediaSource API supports the given codec string.
 * Returns false if MSE is not available (e.g. some mobile WebViews).
 */
function isMseSupported(codecString: string): boolean {
  try {
    if (typeof MediaSource === 'undefined') {
      return false;
    }
    return MediaSource.isTypeSupported(codecString);
  } catch {
    return false;
  }
}

export class MobileAudioSourceFactory {
  fromCandidate(candidate: StreamCandidate): AudioSource {
    const { stream } = candidate;

    if (!stream) {
      return { url: candidate.id, protocol: 'http' };
    }

    if (stream.protocol === 'hls') {
      // HLS streams work natively in both iOS WKWebView and Android WebView
      return { url: stream.url, protocol: 'hls' };
    }

    // For direct streams, proxy through Render to avoid CORS on mobile
    // Validate stream URL before proxying
    if (!stream.url || typeof stream.url !== 'string') {
      console.error('[audioSourceFactory] Invalid stream URL:', stream.url);
      throw new Error('Invalid stream URL');
    }
    if (
      !stream.url.startsWith('http://') &&
      !stream.url.startsWith('https://')
    ) {
      console.error(
        '[audioSourceFactory] Stream URL must be HTTP/HTTPS:',
        stream.url,
      );
      throw new Error('Stream URL must be HTTP/HTTPS');
    }
    console.log('[audioSourceFactory] Proxying stream URL:', stream.url);
    const proxyUrl = buildProxiedUrl(stream.url);
    const durationMs = stream.durationMs ?? candidate.durationMs;
    const mseCodec = toMseCodec(stream);

    // Use MSE (Media Source Extensions) for fMP4 and WebM/opus — these
    // require the browser to know the codec upfront to decode correctly.
    // Plain MP3/AAC files can play via the <audio> src attribute directly.
    // BUT: only use MSE if the browser actually supports it — some mobile
    // WebViews lack MSE support for certain codecs.
    if (mseCodec && durationMs && isMseSupported(mseCodec)) {
      console.log('[audioSourceFactory] Using MSE with codec:', mseCodec);
      return {
        url: proxyUrl,
        protocol: 'mse',
        durationSeconds: durationMs / 1000,
        codec: mseCodec,
      };
    }

    if (mseCodec && durationMs) {
      console.warn(
        '[audioSourceFactory] MSE not supported for codec:',
        mseCodec,
        '— falling back to plain http',
      );
    }

    // Fallback: plain http (works for mp3, aac, ogg in most WebViews)
    return { url: proxyUrl, protocol: 'http' };
  }
}

export const mobileAudioSourceFactory = new MobileAudioSourceFactory();
