/**
 * CORS proxy — mirrors the stream_server.rs from the Tauri backend.
 * The mobile app passes base64-encoded audio URLs here to bypass CORS restrictions.
 *
 * URL encoding: the client sends the target URL as URL-safe base64 in a query
 * parameter (?u=...) rather than a path segment.  Path segments are split by
 * Express on every "/" in the decoded base64 string, causing 404s.
 */
import { Router } from 'express';
import { fetch } from 'undici';

import { streamLimiter } from '../rateLimit.js';

export const proxyRouter = Router();

function decodeProxyParam(encoded: string): string {
  // URL-safe base64 → standard base64 → binary string
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  // Re-pad to a multiple of 4
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  return atob(padded);
}

// Legacy path-segment route — kept for backwards compat with older app builds.
// New builds use the query-param route below.
proxyRouter.get('/stream/:encodedUrl', streamLimiter, async (req, res) => {
  handleProxy(req.params.encodedUrl, req, res);
});

// Preferred route: GET /api/proxy/stream?u=<url-safe-base64>
proxyRouter.get('/stream', streamLimiter, async (req, res) => {
  const u = req.query.u;
  if (typeof u !== 'string' || !u) {
    res.status(400).json({ error: 'Missing ?u= parameter' });
    return;
  }
  handleProxy(u, req, res);
});

async function handleProxy(
  encodedUrl: string,
  req: import('express').Request,
  res: import('express').Response,
): Promise<void> {
  let targetUrl: string;
  try {
    targetUrl = decodeProxyParam(encodedUrl);
  } catch {
    res.status(400).json({ error: 'Invalid encoded URL' });
    return;
  }

  // Only allow http/https upstream URLs
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
        // Some CDNs (e.g. Invidious streams) require Referer or Origin
        Referer: new URL(targetUrl).origin + '/',
      },
    });

    res.status(upstream.status);

    // Forward relevant headers
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
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        res.write(Buffer.from(value));
      }
      res.end();
    };

    await pump();
  } catch (err) {
    console.error('Proxy error:', err);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Upstream fetch failed' });
    }
  }
}
