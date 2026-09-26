import http from 'http';
import fs from 'fs/promises';
import crypto from 'crypto';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env';
import { logger } from './utils/logger';
import { cookieParserMiddleware } from './middleware/cookies';
import { requireCsrf } from './auth/csrf';
import { apiRateLimiter, loginRateLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { connectRedis, sessionStore } from './auth/sessionStore';
import { pool, query } from './db/pool';
import { authRouter } from './auth/routes';
import { deviceRouter } from './routes/device';
import { buildBrowserRouter } from './routes/browser';
import { historyRouter } from './routes/history';
import { bookmarksRouter } from './routes/bookmarks';
import { filesRouter } from './routes/files';
import { downloadsRouter } from './routes/downloads';
import { settingsRouter } from './routes/settings';
import { securityRouter } from './routes/security';
import { notesRouter } from './routes/notes';
import { PlaywrightContextEngine } from './browser/PlaywrightContextEngine';
import { SessionManager } from './browser/SessionManager';
import { attachWebSocketGateway } from './ws/gateway';
import { objectStorage } from './storage/objectStorage';

async function main() {
  console.log('[REDIS DEBUG]', {
  redisUrl: env.redisUrl.replace(/\/\/.*@/, '//***@'),
  nodeEnv: process.env.NODE_ENV,
});
  console.log('[CONFIG CHECK]', {
  databaseHost: (() => {
    try {
      return new URL(env.databaseUrl).hostname;
    } catch {
      return 'INVALID_DATABASE_URL';
    }
  })(),
  redisHost: (() => {
    try {
      return new URL(env.redisUrl).hostname;
    } catch {
      return 'INVALID_REDIS_URL';
    }
  })(),
  nodeEnv: env.nodeEnv,
});
  await connectRedis();

  const engine = new PlaywrightContextEngine();
  const sessionManager = new SessionManager(engine);

  // Persist browser-initiated downloads into the file manager + downloads log.
  engine.on('download', async (sessionId: string, info: { filename: string; path: string; mimeType: string | null; sizeBytes: number }) => {
    try {
      const row = await query<{ user_id: string }>(
        'SELECT user_id FROM browser_sessions WHERE id = $1',
        [sessionId]
      );
      const userId = row[0]?.user_id;
      if (!userId) return;
      const buffer = await fs.readFile(info.path);
      const storageKey = `${userId}/${crypto.randomUUID()}-${info.filename}`;
      await objectStorage.put(storageKey, buffer, info.mimeType ?? undefined);
      const file = await query<{ id: string }>(
        `INSERT INTO files (user_id, name, storage_key, size_bytes, mime_type, source) VALUES ($1,$2,$3,$4,$5,'download') RETURNING id`,
        [userId, info.filename, storageKey, info.sizeBytes, info.mimeType]
      );
      await query(
        `INSERT INTO downloads (user_id, session_id, file_id, filename, size_bytes, mime_type, status) VALUES ($1,$2,$3,$4,$5,$6,'completed')`,
        [userId, sessionId, file[0]?.id ?? null, info.filename, info.sizeBytes, info.mimeType]
      );
      await fs.rm(info.path, { force: true });
    } catch (err) {
      logger.error('Failed to persist download', { error: String(err) });
    }
  });

  const app = express();
  if (env.trustProxy) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", 'ws:', 'wss:'],
          imgSrc: ["'self'", 'data:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
        },
      },
    })
  );
  app.use(cors({ origin: env.appUrl, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParserMiddleware);
  app.use(
    session({
      store: sessionStore,
      name: env.sessionCookieName,
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: env.isProduction,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    })
  );
  app.use('/api', apiRateLimiter);
  app.use('/api/auth/login', loginRateLimiter);
  app.use('/api', requireCsrf);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRouter);
  app.use('/api/device', deviceRouter);
  app.use('/api/browser', buildBrowserRouter(engine, sessionManager));
  app.use('/api/history', historyRouter);
  app.use('/api/bookmarks', bookmarksRouter);
  app.use('/api/files', filesRouter);
  app.use('/api/downloads', downloadsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/security', securityRouter);
  app.use('/api/notes', notesRouter);

  app.use('/api', notFoundHandler);
  app.use(errorHandler as express.ErrorRequestHandler);

  const server = http.createServer(app);
  attachWebSocketGateway(server, engine, sessionManager);

  server.listen(env.port, () => {
    logger.info(`ANURAG VIRTUAL COMPUTER backend listening on :${env.port}`);
  });

  const idleSweepTimer = setInterval(() => {
    sessionManager.sweepIdleSessions().catch((err) => logger.error('Idle sweep failed', { error: String(err) }));
  }, 60_000);

  async function shutdown(signal: string) {
    logger.info(`Received ${signal}, shutting down`);
    clearInterval(idleSweepTimer);
    server.close();
    await pool.end().catch(() => undefined);
    process.exit(0);
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Fatal startup error', { error: err instanceof Error ? err.stack ?? err.message : String(err) });
  process.exit(1);
});
