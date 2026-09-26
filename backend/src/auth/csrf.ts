import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Issues (or refreshes) the readable CSRF cookie the frontend echoes back as a header. */
export function issueCsrfCookie(req: Request, res: Response): void {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(env.csrfCookieName, token, {
    httpOnly: false, // must be readable by frontend JS to echo back as a header
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Double-submit cookie CSRF check: the request must carry the same token in
 * both the cookie (set by us) and a custom header (settable only by same-origin
 * JS, since browsers won't let cross-site pages read or set it). Safe methods
 * are exempt since they must not have side effects.
 */
export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[env.csrfCookieName];
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken || !timingSafeEqual(cookieToken, headerToken)) {
    return next(AppError.forbidden('Your session looks out of date. Refresh and try again.', 'csrf_invalid'));
  }
  next();
}
