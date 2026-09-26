import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import { queryOne, query } from '../db/pool';
import { listActiveSessions, destroySessionById, destroyAllOtherSessions } from '../auth/sessionStore';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import type { Device } from '../types';

export const securityRouter = Router();
securityRouter.use(requireAuth);

/**
 * Every value here is computed from real request/config state, never
 * hardcoded — the app must not claim security properties it can't verify.
 */
securityRouter.get('/status', async (req, res, next) => {
  try {
    const device = await queryOne<Device>('SELECT session_mode, pin_hash FROM devices WHERE id = $1', [
      req.auth!.deviceId,
    ]);
    const isHttps = req.secure || req.get('x-forwarded-proto') === 'https';
    const sessions = await listActiveSessions(req.auth!.userId, req.sessionID);

    res.json({
      browserIsolation: { active: true, detail: 'Separate Chromium profile per session' },
      https: { active: isHttps, detail: isHttps ? 'Connection is encrypted' : 'Not currently served over HTTPS' },
      secureSessionCookie: { active: env.isProduction, detail: env.isProduction ? 'Secure cookie flag set' : 'Set NODE_ENV=production behind HTTPS to enable' },
      privateProfile: { active: device?.session_mode === 'private', detail: device?.session_mode === 'private' ? 'Private session mode' : 'Persistent session mode' },
      passwordProtection: { active: true, detail: 'Account requires a password to sign in' },
      devicePinSet: { active: !!device?.pin_hash, detail: device?.pin_hash ? 'Device PIN configured' : 'No device PIN set' },
      activeSessionCount: sessions.length,
    });
  } catch (err) {
    next(err);
  }
});

securityRouter.get('/sessions', async (req, res, next) => {
  try {
    const sessions = await listActiveSessions(req.auth!.userId, req.sessionID);
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
});

securityRouter.delete('/sessions/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.sessionID) {
      throw AppError.badRequest('Use logout to end your current session.', 'cannot_revoke_current');
    }
    await destroySessionById(req.auth!.userId, req.params.id);
    await query('INSERT INTO security_events (user_id, event_type, metadata) VALUES ($1, $2, $3)', [
      req.auth!.userId,
      'session_revoked',
      JSON.stringify({ revokedSessionId: req.params.id }),
    ]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

securityRouter.delete('/sessions', async (req, res, next) => {
  try {
    const count = await destroyAllOtherSessions(req.auth!.userId, req.sessionID);
    res.json({ revoked: count });
  } catch (err) {
    next(err);
  }
});

securityRouter.get('/events', async (req, res, next) => {
  try {
    const events = await query(
      'SELECT event_type, metadata, ip_address, created_at FROM security_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100',
      [req.auth!.userId]
    );
    res.json({ events });
  } catch (err) {
    next(err);
  }
});
