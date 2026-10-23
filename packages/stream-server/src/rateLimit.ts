import rateLimit from 'express-rate-limit';

/** 60 requests per minute per IP — adjust as needed for your usage. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

/** Stricter limit for stream resolution (more expensive operation). */
export const streamLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Stream rate limit exceeded.' },
});
