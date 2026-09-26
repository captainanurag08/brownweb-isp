import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware';
import { validate } from '../middleware/validate';
import { queryOne } from '../db/pool';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

settingsRouter.get('/', async (req, res, next) => {
  try {
    const settings = await queryOne('SELECT * FROM user_settings WHERE user_id = $1', [req.auth!.userId]);
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

const patchSchema = z.object({
  historyRetentionDays: z.number().int().min(1).max(3650).optional(),
  logFullUrls: z.boolean().optional(),
});

settingsRouter.patch('/', validate('body', patchSchema), async (req, res, next) => {
  try {
    const b = req.body as z.infer<typeof patchSchema>;
    const settings = await queryOne(
      `UPDATE user_settings SET
         history_retention_days = COALESCE($1, history_retention_days),
         log_full_urls = COALESCE($2, log_full_urls),
         updated_at = now()
       WHERE user_id = $3
       RETURNING *`,
      [b.historyRetentionDays, b.logFullUrls, req.auth!.userId]
    );
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});
