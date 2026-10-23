import rateLimit from 'express-rate-limit';

/**
 * express-rate-limit v7 requires `validate: { trustProxy: false }` (or a
 * custom `keyGenerator`) when the app uses `trust proxy`.  Without it the
 * library throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR when the header contains
 * more than one IP (e.g. Render/Cloudflare chains).
 *
 * We set `validate: { trustProxy: false }` to silence the check because we
 * already handle proxy trust at the Express level (`app.set('trust proxy', 1)`).
 */
const sharedValidation = { validate: { trustProxy: false } };

/** 60 requests per minute per IP — adjust as needed for your usage. */
export const apiLimiter = rateLimit({
  ...sharedValidation,
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

/** Stricter limit for stream resolution (more expensive operation). */
export const streamLimiter = rateLimit({
  ...sharedValidation,
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Stream rate limit exceeded.' },
});
