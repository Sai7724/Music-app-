import { Router } from 'express';
import { z } from 'zod';

import { streamLimiter } from '../rateLimit.js';
import { getStream } from '../ytdlp.js';

export const streamRouter = Router();

const querySchema = z.object({
  url: z.string().url().optional(),
  videoId: z.string().min(1).max(64).optional(),
}).refine((data) => data.url ?? data.videoId, {
  message: 'Either url or videoId must be provided',
});

streamRouter.get('/', streamLimiter, async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const urlOrId = (parsed.data.url ?? parsed.data.videoId) as string;

  try {
    const info = await getStream(urlOrId);
    res.json(info);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[stream] resolution error for', urlOrId, ':', detail);
    res.status(500).json({ error: 'Stream resolution failed', detail });
  }
});
