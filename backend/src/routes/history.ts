import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware';
import { validate } from '../middleware/validate';
import { query } from '../db/pool';
import { groupByDay, searchHistory, type HistoryEntry } from '../history/groupByDay';

export const historyRouter = Router();
historyRouter.use(requireAuth);

const listSchema = z.object({ q: z.string().max(256).optional() });

historyRouter.get('/', validate('query', listSchema), async (req, res, next) => {
  try {
    const { q } = req.query as z.infer<typeof listSchema>;
    const entries = await query<HistoryEntry>(
      `SELECT id, url, title, visited_at FROM browser_history WHERE user_id = $1 ORDER BY visited_at DESC LIMIT 1000`,
      [req.auth!.userId]
    );
    const filtered = q ? searchHistory(entries, q) : entries;
    res.json({ groups: groupByDay(filtered) });
  } catch (err) {
    next(err);
  }
});

historyRouter.delete('/today', async (req, res, next) => {
  try {
    await query(
      `DELETE FROM browser_history WHERE user_id = $1 AND visited_at >= date_trunc('day', now())`,
      [req.auth!.userId]
    );
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

historyRouter.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM browser_history WHERE id = $1 AND user_id = $2', [req.params.id, req.auth!.userId]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

historyRouter.delete('/', async (req, res, next) => {
  try {
    await query('DELETE FROM browser_history WHERE user_id = $1', [req.auth!.userId]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
