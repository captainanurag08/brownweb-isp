import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware';
import { validate } from '../middleware/validate';
import { query, queryOne } from '../db/pool';
import { AppError } from '../utils/AppError';

export const bookmarksRouter = Router();

bookmarksRouter.use(requireAuth);

/**
 * GET /bookmarks
 * Get all bookmarks belonging to the logged-in user.
 */
bookmarksRouter.get('/', async (req, res, next) => {
  try {
    const bookmarks = await query(
      `SELECT *
       FROM bookmarks
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.auth!.userId]
    );

    res.json({ bookmarks });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /bookmarks
 * Create one bookmark.
 */
const createSchema = z.object({
  title: z.string().min(1).max(256),
  url: z.string().url().max(2048),
  favicon: z.string().url().max(2048).optional(),
  folderId: z.string().uuid().optional(),
});

bookmarksRouter.post(
  '/',
  validate('body', createSchema),
  async (req, res, next) => {
    try {
      const b = req.body as z.infer<typeof createSchema>;

      const bookmark = await queryOne(
        `INSERT INTO bookmarks
          (user_id, title, url, favicon, folder_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          req.auth!.userId,
          b.title,
          b.url,
          b.favicon ?? null,
          b.folderId ?? null,
        ]
      );

      res.status(201).json({ bookmark });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /bookmarks/bulk
 * Create multiple bookmarks for the logged-in user.
 */
const bulkCreateSchema = z.object({
  bookmarks: z
    .array(
      z.object({
        title: z.string().min(1).max(256),
        url: z.string().url().max(2048),
        favicon: z.string().url().max(2048).optional(),
        folderId: z.string().uuid().optional(),
      })
    )
    .min(1)
    .max(500),
});

bookmarksRouter.post(
  '/bulk',
  validate('body', bulkCreateSchema),
  async (req, res, next) => {
    try {
      const { bookmarks } = req.body as z.infer<
        typeof bulkCreateSchema
      >;

      const userId = req.auth!.userId;
      const created = [];

      for (const bookmarkData of bookmarks) {
        const bookmark = await queryOne(
          `INSERT INTO bookmarks
            (user_id, title, url, favicon, folder_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [
            userId,
            bookmarkData.title,
            bookmarkData.url,
            bookmarkData.favicon ?? null,
            bookmarkData.folderId ?? null,
          ]
        );

        if (bookmark) {
          created.push(bookmark);
        }
      }

      res.status(201).json({
        bookmarks: created,
        count: created.length,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /bookmarks/:id
 * Update a bookmark belonging to the logged-in user.
 */
const updateSchema = z.object({
  title: z.string().min(1).max(256).optional(),
  url: z.string().url().max(2048).optional(),
  folderId: z.string().uuid().nullable().optional(),
});

bookmarksRouter.patch(
  '/:id',
  validate('body', updateSchema),
  async (req, res, next) => {
    try {
      const b = req.body as z.infer<typeof updateSchema>;

      const bookmark = await queryOne(
        `UPDATE bookmarks
         SET
           title = COALESCE($1, title),
           url = COALESCE($2, url),
           folder_id = COALESCE($3, folder_id)
         WHERE id = $4
           AND user_id = $5
         RETURNING *`,
        [
          b.title,
          b.url,
          b.folderId,
          req.params.id,
          req.auth!.userId,
        ]
      );

      if (!bookmark) {
        throw AppError.notFound();
      }

      res.json({ bookmark });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /bookmarks/:id
 * Delete a bookmark belonging to the logged-in user.
 */
bookmarksRouter.delete('/:id', async (req, res, next) => {
  try {
    await query(
      `DELETE FROM bookmarks
       WHERE id = $1
         AND user_id = $2`,
      [req.params.id, req.auth!.userId]
    );

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
