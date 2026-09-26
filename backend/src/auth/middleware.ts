import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { touchSession } from './sessionStore';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: { userId: string; deviceId: string };
  }
}

const TOUCH_INTERVAL_MS = 60_000;
const lastTouch = new Map<string, number>();

/**
 * Populates req.auth from the server-side session. This is the ONLY place
 * user identity is established for a request — route handlers must never
 * read a user id from the request body, query string, or headers.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.session?.userId;
  const deviceId = req.session?.deviceId;
  if (!userId || !deviceId) {
    return next(AppError.unauthorized());
  }
  req.auth = { userId, deviceId };

  // Fire-and-forget "last seen" refresh for the active-sessions list, throttled
  // so we're not writing to Redis on every single request.
  const sid = req.sessionID;
  const last = lastTouch.get(sid) ?? 0;
  if (Date.now() - last > TOUCH_INTERVAL_MS) {
    lastTouch.set(sid, Date.now());
    touchSession(sid).catch(() => {
      /* best-effort; not worth failing the request over */
    });
  }

  next();
}
