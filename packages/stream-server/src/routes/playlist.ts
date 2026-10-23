import { Router } from 'express';
import { z } from 'zod';

import { apiLimiter } from '../rateLimit.js';
import { getPlaylist } from '../ytdlp.js';

export const playlistRouter = Router();

const querySchema = z.object({
  url: z.string().url(),
});

playlistRouter.get('/', apiLimiter, async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const playlist = await getPlaylist(parsed.data.url);
    res.json(playlist);
  } catch (err) {
    console.error('Playlist fetch error:', err);
    res.status(500).json({ error: 'Playlist fetch failed' });
  }
});
