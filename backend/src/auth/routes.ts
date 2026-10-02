import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { hashPassword, verifyPassword, isPasswordAcceptable } from './password';
import { isLocked, onFailedAttempt, onSuccessfulLogin } from './lockout';
import { trackSession, untrackSession, destroySessionById } from './sessionStore';
import { issueCsrfCookie } from './csrf';
import { requireAuth } from './middleware';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';
import type { User, Device } from '../types';

export const authRouter = Router();

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(256),
});

function deviceCode(): string {
  const part = () =>
    crypto.randomBytes(2).toString('hex').toUpperCase();

  return `VC-${part()}-${part()}`;
}

async function logSecurityEvent(
  userId: string | null,
  eventType: string,
  req: import('express').Request,
  metadata: Record<string, unknown> = {}
) {
  await query(
    `INSERT INTO security_events
      (user_id, event_type, metadata, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      userId,
      eventType,
      JSON.stringify(metadata),
      req.ip ?? null,
      req.get('user-agent') ?? null,
    ]
  );
}

async function establishSession(
  req: import('express').Request,
  res: import('express').Response,
  user: User,
  device: Device
) {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) =>
      err ? reject(err) : resolve()
    );
  });

  req.session.userId = user.id;
  req.session.deviceId = device.id;

  await new Promise<void>((resolve, reject) => {
    req.session.save((err) =>
      err ? reject(err) : resolve()
    );
  });

  await trackSession(user.id, req.sessionID, {
    userAgent: req.get('user-agent') ?? 'unknown',
    ip: req.ip ?? 'unknown',
    createdAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  });

  issueCsrfCookie(req, res);
}

/*
 * Public endpoint.
 *
 * A brand-new browser/device needs the CSRF cookie BEFORE it
 * can submit register/login because /api uses requireCsrf.
 */
authRouter.get('/csrf', (req, res) => {
  issueCsrfCookie(req, res);
  res.json({ ok: true });
});

authRouter.post('/register', async (req, res, next) => {
  try {
    const parsed = credentialsSchema.safeParse(req.body);

    if (!parsed.success) {
      throw AppError.badRequest(
        'Enter a valid email and password.',
        'invalid_input'
      );
    }

    const { email, password } = parsed.data;

    if (!isPasswordAcceptable(password)) {
      throw AppError.badRequest(
        'Password must be at least 10 characters.',
        'weak_password'
      );
    }

    const existing = await queryOne<User>(
      'SELECT id FROM users WHERE lower(email) = lower($1)',
      [email]
    );

    if (existing) {
      throw AppError.conflict(
        'An account with that email already exists.',
        'email_taken'
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await queryOne<User>(
      `INSERT INTO users
        (email, password_hash)
       VALUES ($1, $2)
       RETURNING *`,
      [email, passwordHash]
    );

    if (!user) {
      throw new Error('Failed to create user');
    }

    const device = await queryOne<Device>(
      `INSERT INTO devices
        (user_id, name, device_code)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user.id, 'ANURAG-PC', deviceCode()]
    );

    if (!device) {
      throw new Error('Failed to create device');
    }

    await query(
      `INSERT INTO user_settings (user_id)
       VALUES ($1)`,
      [user.id]
    );

    await query(
      `INSERT INTO device_settings (device_id)
       VALUES ($1)`,
      [device.id]
    );

    await establishSession(
      req,
      res,
      user,
      device
    );

    await logSecurityEvent(
      user.id,
      'account_created',
      req
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
      },
      device,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const parsed = credentialsSchema.safeParse(req.body);

    if (!parsed.success) {
      throw AppError.badRequest(
        'Enter a valid email and password.',
        'invalid_input'
      );
    }

    const { email, password } = parsed.data;
    const now = new Date();

    const user = await queryOne<User>(
      'SELECT * FROM users WHERE lower(email) = lower($1)',
      [email]
    );

    const genericFailure = () => {
      throw AppError.unauthorized(
        'Incorrect email or password.',
        'invalid_credentials'
      );
    };

    if (!user) {
      await hashPassword(password);
      return genericFailure();
    }

    if (
      isLocked(
        {
          failedAttempts: user.failed_login_attempts,
          lockedUntil: user.locked_until,
        },
        now
      )
    ) {
      throw AppError.tooMany(
        'Too many failed attempts. Try again later.',
        'account_locked'
      );
    }

    const valid = await verifyPassword(
      password,
      user.password_hash
    );

    if (!valid) {
      const next_ = onFailedAttempt(
        {
          failedAttempts: user.failed_login_attempts,
          lockedUntil: user.locked_until,
        },
        {
          threshold: env.lockoutThreshold,
          durationMinutes: env.lockoutDurationMinutes,
        },
        now
      );

      await query(
        `UPDATE users
         SET failed_login_attempts = $1,
             locked_until = $2
         WHERE id = $3`,
        [
          next_.failedAttempts,
          next_.lockedUntil,
          user.id,
        ]
      );

      await logSecurityEvent(
        user.id,
        'login_failed',
        req
      );

      if (next_.lockedUntil) {
        await logSecurityEvent(
          user.id,
          'account_locked',
          req
        );
      }

      return genericFailure();
    }

    const reset = onSuccessfulLogin();

    await query(
      `UPDATE users
       SET failed_login_attempts = $1,
           locked_until = $2,
           last_login_at = now()
       WHERE id = $3`,
      [
        reset.failedAttempts,
        reset.lockedUntil,
        user.id,
      ]
    );

    const device = await queryOne<Device>(
      `SELECT *
       FROM devices
       WHERE user_id = $1
       LIMIT 1`,
      [user.id]
    );

    if (!device) {
      throw new Error('User has no device');
    }

    await establishSession(
      req,
      res,
      user,
      device
    );

    await logSecurityEvent(
      user.id,
      'login_success',
      req
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
      },
      device,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post(
  '/logout',
  requireAuth,
  async (req, res, next) => {
    try {
      const userId = req.auth!.userId;
      const sid = req.sessionID;

      await logSecurityEvent(
        userId,
        'logout',
        req
      );

      await untrackSession(
        userId,
        sid
      );

      await new Promise<void>((resolve, reject) => {
        req.session.destroy((err) =>
          err ? reject(err) : resolve()
        );
      });

      res.clearCookie(
        env.sessionCookieName
      );

      res.clearCookie(
        env.csrfCookieName
      );

      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

authRouter.get(
  '/me',
  requireAuth,
  async (req, res, next) => {
    try {
      const user = await queryOne<User>(
        `SELECT id, email
         FROM users
         WHERE id = $1`,
        [req.auth!.userId]
      );

      const device = await queryOne<Device>(
        `SELECT *
         FROM devices
         WHERE id = $1`,
        [req.auth!.deviceId]
      );

      if (!user || !device) {
        throw AppError.unauthorized();
      }

      res.json({
        user,
        device,
      });
    } catch (err) {
      next(err);
    }
  }
);

export { destroySessionById };
