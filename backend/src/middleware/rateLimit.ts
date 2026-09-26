import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

/** General-purpose API throttle. In-memory per instance — fine for a single
 * backend replica; for multiple replicas behind a load balancer, swap the
 * store for a shared one (see docs/DEPLOYMENT.md). */
export const apiRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginRateLimiter = rateLimit({
  windowMs: env.loginRateLimitWindowMinutes * 60_000,
  limit: env.loginRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many attempts. Try again shortly.' } },
});
