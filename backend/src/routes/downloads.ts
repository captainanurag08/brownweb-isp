import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import { query } from '../db/pool';

export const downloadsRouter = Router();
downloadsRouter.use(requireAuth);

downloadsRouter.get('/', async (req, res, next) => {
  try {
    const downloads = await query(
      'SELECT * FROM downloads WHERE user_id = $1 ORDER BY created_at DESC LIMIT 500',
      [req.auth!.userId]
    );
    res.json({ downloads });
  } catch (err) {
    next(err);
  }
});
