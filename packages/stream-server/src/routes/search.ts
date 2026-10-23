import { Router } from 'express';
import { z } from 'zod';

import { apiLimiter } from '../rateLimit.js';
import { search } from '../ytdlp.js';

export const searchRouter = Router();

const querySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

searchRouter.get('/', apiLimiter, async (req, res) => {
  // Log for debugging on Render
  console.log('[search] query:', JSON.stringify(req.query));

  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    console.error('[search] validation failed:', parsed.error.flatten());
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const results = await search(parsed.data.q, parsed.data.limit);
    res.json(results);
  } catch (err) {
    console.error('[search] error:', err);
    res.status(500).json({ error: 'Search failed', detail: String(err) });
  }
});
