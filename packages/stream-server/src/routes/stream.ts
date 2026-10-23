import { Router } from 'express';
import { z } from 'zod';

import { streamLimiter } from '../rateLimit.js';
import { resolveStream } from '../sources/resolver.js';

export const streamRouter = Router();

const querySchema = z
  .object({
    // New format: "provider:id"  e.g. "youtube:dQw4w9WgXcQ"
    id: z.string().min(1).max(200).optional(),
    // Legacy: plain videoId (treated as YouTube)
    videoId: z.string().min(1).max(64).optional(),
    // Legacy: full URL
    url: z.string().url().optional(),
    // Optional title hint for cross-source fallback
    title: z.string().max(200).optional(),
  })
  .refine((d) => d.id ?? d.videoId ?? d.url, {
    message: 'Provide id, videoId, or url',
  });

streamRouter.get('/', streamLimiter, async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { id, videoId, url } = parsed.data;

  // Normalise to composite id
  let compositeId: string;
  if (id) {
    compositeId = id;
  } else if (videoId) {
    compositeId = `youtube:${videoId}`;
  } else {
    // Extract YouTube video ID from URL
    try {
      const u = new URL(url!);
      const v = u.searchParams.get('v') ?? u.pathname.replace('/', '');
      compositeId = `youtube:${v}`;
    } catch {
      compositeId = `youtube:${url}`;
    }
  }

  try {
    const info = await resolveStream(compositeId);
    res.json(info);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[stream] failed for', compositeId, ':', detail);
    res.status(500).json({ error: 'Stream resolution failed', detail });
  }
});
