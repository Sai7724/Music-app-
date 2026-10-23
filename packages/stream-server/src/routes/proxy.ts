/**
 * CORS proxy — mirrors the stream_server.rs from the Tauri backend.
 * The mobile app passes base64-encoded audio URLs here to bypass CORS restrictions.
 */
import { Router } from 'express';
import { fetch } from 'undici';

import { streamLimiter } from '../rateLimit.js';

export const proxyRouter = Router();

// GET /api/proxy/stream/:encodedUrl
proxyRouter.get('/stream/:encodedUrl', streamLimiter, async (req, res) => {
  const { encodedUrl } = req.params;

  let targetUrl: string;
  try {
    // URL-safe base64 → standard base64 → decode
    const base64 = encodedUrl.replace(/-/g, '+').replace(/_/g, '/');
    targetUrl = atob(base64);
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
        if (done) break;
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
});
