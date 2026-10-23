/**
 * CORS proxy — mirrors the stream_server.rs from the Tauri backend.
 * The mobile app passes the target URL percent-encoded in the ?u= query param.
 *
 * History:
 *   v1 — base64 in path segment (:encodedUrl): broke on "/" in base64 output.
 *   v2 — url-safe base64 in ?u= query param: broke on btoa() with chars > 0xFF
 *        (common in YouTube sig parameters — btoa is latin-1 only).
 *   v3 (current) — plain encodeURIComponent in ?u=, decodeURIComponent on server.
 */
import { Router } from 'express';
import { fetch } from 'undici';

import { streamLimiter } from '../rateLimit.js';

export const proxyRouter = Router();

// Preferred: GET /api/proxy/stream?u=<encodeURIComponent(url)>
proxyRouter.get('/stream', streamLimiter, async (req, res) => {
  const u = req.query.u;
  console.log('[proxy] Received request with u param:', u);

  if (typeof u !== 'string' || !u) {
    console.error('[proxy] Missing or invalid ?u= parameter');
    res.status(400).json({ error: 'Missing ?u= parameter' });
    return;
  }

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(u);
    console.log('[proxy] Decoded target URL:', targetUrl);
  } catch (err) {
    console.error('[proxy] Failed to decode URL:', err);
    res.status(400).json({ error: 'Invalid encoded URL' });
    return;
  }

  await proxyUpstream(targetUrl, req, res);
});

// Legacy: GET /api/proxy/stream/:encodedUrl (url-safe base64, old app builds)
proxyRouter.get('/stream/:encodedUrl', streamLimiter, async (req, res) => {
  const { encodedUrl } = req.params;

  let targetUrl: string;
  try {
    const base64 = encodedUrl.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    targetUrl = atob(padded);
  } catch {
    res.status(400).json({ error: 'Invalid encoded URL' });
    return;
  }

  await proxyUpstream(targetUrl, req, res);
});

async function proxyUpstream(
  targetUrl: string,
  req: import('express').Request,
  res: import('express').Response,
): Promise<void> {
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    res.status(400).json({ error: 'Invalid upstream URL' });
    return;
  }

  try {
    const range = req.headers.range;
    const upstream = await fetch(targetUrl, {
      headers: {
        ...(range ? { Range: range } : {}),
        'User-Agent': 'Mozilla/5.0',
        // Invidious/YouTube CDNs reject requests without a Referer
        Referer: new URL(targetUrl).origin + '/',
      },
    });

    res.status(upstream.status);

    const forward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
    ];
    for (const header of forward) {
      const value = upstream.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    }

    if (!upstream.body) {
      res.end();
      return;
    }

    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (err) {
    console.error('Proxy error:', err);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Upstream fetch failed' });
    }
  }
}
