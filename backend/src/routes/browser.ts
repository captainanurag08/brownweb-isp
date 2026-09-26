import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware';
import { validate } from '../middleware/validate';
import { queryOne } from '../db/pool';
import { normalizeUrl } from '../browser/BrowserEngine';
import { AppError } from '../utils/AppError';
import type { PlaywrightContextEngine } from '../browser/PlaywrightContextEngine';
import type { SessionManager } from '../browser/SessionManager';
import type { BrowserSessionRow, Device } from '../types';

export function buildBrowserRouter(engine: PlaywrightContextEngine, sessionManager: SessionManager): Router {
  const router = Router();
  router.use(requireAuth);

  async function currentSession(userId: string): Promise<BrowserSessionRow> {
    const row = await queryOne<BrowserSessionRow>(
      `SELECT * FROM browser_sessions WHERE user_id = $1 AND status IN ('starting','running','idle') ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    if (!row) throw AppError.notFound('No active browser session. Connect over WebSocket to start one.');
    return row;
  }

  router.post('/session', async (req, res, next) => {
    try {
      const device = await queryOne<Device>('SELECT * FROM devices WHERE id = $1', [req.auth!.deviceId]);
      if (!device) throw AppError.notFound();
      const row = await sessionManager.getOrCreateSession(req.auth!.userId, req.auth!.deviceId, device.session_mode);
      res.status(201).json({ session: row, tabs: engine.getTabs(row.id) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/session', async (req, res, next) => {
    try {
      const row = await currentSession(req.auth!.userId);
      res.json({ session: row, tabs: engine.hasSession(row.id) ? engine.getTabs(row.id) : [] });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/session', async (req, res, next) => {
    try {
      const row = await currentSession(req.auth!.userId);
      await sessionManager.destroySession(row.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.get('/tabs', async (req, res, next) => {
    try {
      const row = await currentSession(req.auth!.userId);
      res.json({ tabs: engine.getTabs(row.id) });
    } catch (err) {
      next(err);
    }
  });

  const newTabSchema = z.object({ url: z.string().max(4000).optional() });
  router.post('/tabs', validate('body', newTabSchema), async (req, res, next) => {
    try {
      const row = await currentSession(req.auth!.userId);
      const device = await queryOne<Device>('SELECT * FROM devices WHERE id = $1', [req.auth!.deviceId]);
      const url = normalizeUrl((req.body as { url?: string }).url ?? device!.homepage, device!.search_engine);
      const tab = await engine.newTab(row.id, url);
      res.status(201).json({ tab });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/tabs/:id', async (req, res, next) => {
    try {
      const row = await currentSession(req.auth!.userId);
      await engine.closeTab(row.id, req.params.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  const navigateSchema = z.object({ tabId: z.string(), url: z.string().max(4000) });
  router.post('/navigate', validate('body', navigateSchema), async (req, res, next) => {
    try {
      const row = await currentSession(req.auth!.userId);
      const device = await queryOne<Device>('SELECT * FROM devices WHERE id = $1', [req.auth!.deviceId]);
      const { tabId, url } = req.body as z.infer<typeof navigateSchema>;
      await engine.navigate(row.id, tabId, normalizeUrl(url, device!.search_engine));
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  const tabActionSchema = z.object({ tabId: z.string() });
  for (const [pathSuffix, fn] of [
    ['back', (e: PlaywrightContextEngine, s: string, t: string) => e.goBack(s, t)],
    ['forward', (e: PlaywrightContextEngine, s: string, t: string) => e.goForward(s, t)],
    ['reload', (e: PlaywrightContextEngine, s: string, t: string) => e.reload(s, t)],
  ] as const) {
    router.post(`/${pathSuffix}`, validate('body', tabActionSchema), async (req, res, next) => {
      try {
        const row = await currentSession(req.auth!.userId);
        const { tabId } = req.body as z.infer<typeof tabActionSchema>;
        await fn(engine, row.id, tabId);
        res.status(204).end();
      } catch (err) {
        next(err);
      }
    });
  }

  return router;
}
