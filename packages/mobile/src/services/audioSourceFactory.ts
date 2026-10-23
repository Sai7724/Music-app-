/**
 * Mobile audio source factory.
 * Replaces the Tauri stream_server proxy with the Render proxy endpoint.
 */
import { AudioSource } from '@nuclearplayer/hifi';
import type { StreamCandidate } from '@nuclearplayer/model';

import { buildProxiedUrl } from '../native/streamApi';

type ResolvedStream = NonNullable<StreamCandidate['stream']>;

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
    const proxyUrl = buildProxiedUrl(stream.url);
    const durationMs = stream.durationMs ?? candidate.durationMs;

    if (this.isFmp4(stream) && durationMs) {
      return {
        url: proxyUrl,
        protocol: 'mse',
        durationSeconds: durationMs / 1000,
        codec: stream.codec,
      };
    }

    return { url: proxyUrl, protocol: stream.protocol };
  }

  private isFmp4(stream: ResolvedStream): boolean {
    return (
      stream.container === 'm4a' ||
      stream.mimeType?.includes('audio/mp4') === true
    );
  }
}

export const mobileAudioSourceFactory = new MobileAudioSourceFactory();
