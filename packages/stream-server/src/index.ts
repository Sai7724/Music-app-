import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { searchRouter } from './routes/search.js';
import { streamRouter } from './routes/stream.js';
import { playlistRouter } from './routes/playlist.js';
import { proxyRouter } from './routes/proxy.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4200;

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS — restrict to your mobile app's origin in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['*'];

app.use(cors({
  origin: allowedOrigins.includes('*') ? '*' : (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '1mb' }));

// Health check — Render uses this
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// API routes
app.use('/api/search', searchRouter);
app.use('/api/stream', streamRouter);
app.use('/api/playlist', playlistRouter);
app.use('/api/proxy', proxyRouter);

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Nuclear stream server running on port ${PORT}`);
});
