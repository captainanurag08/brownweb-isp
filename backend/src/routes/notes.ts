import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware';
import { validate } from '../middleware/validate';
import { query, queryOne } from '../db/pool';
import { AppError } from '../utils/AppError';

export const notesRouter = Router();
notesRouter.use(requireAuth);

notesRouter.get('/', async (req, res, next) => {
  try {
    const notes = await query('SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC', [req.auth!.userId]);
    res.json({ notes });
  } catch (err) {
    next(err);
  }
});

const createSchema = z.object({ title: z.string().max(256).optional(), content: z.string().max(100_000).optional() });
notesRouter.post('/', validate('body', createSchema), async (req, res, next) => {
  try {
    const b = req.body as z.infer<typeof createSchema>;
    const note = await queryOne(
      'INSERT INTO notes (user_id, title, content) VALUES ($1, COALESCE($2, $3), COALESCE($4, $5)) RETURNING *',
      [req.auth!.userId, b.title, 'Untitled note', b.content, '']
    );
    res.status(201).json({ note });
  } catch (err) {
    next(err);
  }
});

const updateSchema = z.object({ title: z.string().max(256).optional(), content: z.string().max(100_000).optional() });
notesRouter.patch('/:id', validate('body', updateSchema), async (req, res, next) => {
  try {
    const b = req.body as z.infer<typeof updateSchema>;
    const note = await queryOne(
      `UPDATE notes SET title = COALESCE($1, title), content = COALESCE($2, content), updated_at = now()
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [b.title, b.content, req.params.id, req.auth!.userId]
    );
    if (!note) throw AppError.notFound();
    res.json({ note });
  } catch (err) {
    next(err);
  }
});

notesRouter.delete('/:id', async (req, res, next) => {
  try {
    await query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [req.params.id, req.auth!.userId]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
