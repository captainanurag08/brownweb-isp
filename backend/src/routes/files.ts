import { Router } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware';
import { validate } from '../middleware/validate';
import { query, queryOne } from '../db/pool';
import { objectStorage } from '../storage/objectStorage';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';

export const filesRouter = Router();
filesRouter.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024 * 1024 } });

interface FileRow {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  storage_key: string;
  size_bytes: string;
  mime_type: string | null;
  source: string;
  created_at: string;
}

filesRouter.get('/', async (req, res, next) => {
  try {
    const folderId = typeof req.query.folderId === 'string' ? req.query.folderId : null;
    const folders = await query(
      'SELECT * FROM folders WHERE user_id = $1 AND parent_id IS NOT DISTINCT FROM $2 ORDER BY name',
      [req.auth!.userId, folderId]
    );
    const files = await query<FileRow>(
      'SELECT * FROM files WHERE user_id = $1 AND folder_id IS NOT DISTINCT FROM $2 ORDER BY created_at DESC',
      [req.auth!.userId, folderId]
    );
    const usage = await queryOne<{ total: string }>(
      'SELECT COALESCE(SUM(size_bytes), 0)::text as total FROM files WHERE user_id = $1',
      [req.auth!.userId]
    );
    res.json({
      folders,
      files,
      storage: { usedBytes: Number(usage?.total ?? 0), quotaBytes: env.storageQuotaMb * 1024 * 1024 },
    });
  } catch (err) {
    next(err);
  }
});

const createFolderSchema = z.object({ name: z.string().min(1).max(128), parentId: z.string().uuid().optional() });
filesRouter.post('/folders', validate('body', createFolderSchema), async (req, res, next) => {
  try {
    const b = req.body as z.infer<typeof createFolderSchema>;
    const folder = await queryOne(
      'INSERT INTO folders (user_id, parent_id, name) VALUES ($1, $2, $3) RETURNING *',
      [req.auth!.userId, b.parentId ?? null, b.name]
    );
    res.status(201).json({ folder });
  } catch (err) {
    next(err);
  }
});

filesRouter.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw AppError.badRequest('No file provided.');

    const usage = await queryOne<{ total: string }>(
      'SELECT COALESCE(SUM(size_bytes), 0)::text as total FROM files WHERE user_id = $1',
      [req.auth!.userId]
    );
    const quotaBytes = env.storageQuotaMb * 1024 * 1024;
    if (Number(usage?.total ?? 0) + req.file.size > quotaBytes) {
      throw AppError.badRequest('Storage quota exceeded.', 'quota_exceeded');
    }

    const folderId = typeof req.body.folderId === 'string' && req.body.folderId ? req.body.folderId : null;
    const storageKey = `${req.auth!.userId}/${crypto.randomUUID()}-${req.file.originalname}`;
    await objectStorage.put(storageKey, req.file.buffer, req.file.mimetype);

    const file = await queryOne(
      `INSERT INTO files (user_id, folder_id, name, storage_key, size_bytes, mime_type, source)
       VALUES ($1, $2, $3, $4, $5, $6, 'upload') RETURNING *`,
      [req.auth!.userId, folderId, req.file.originalname, storageKey, req.file.size, req.file.mimetype]
    );
    res.status(201).json({ file });
  } catch (err) {
    next(err);
  }
});

filesRouter.get('/:id/download', async (req, res, next) => {
  try {
    const file = await queryOne<FileRow>('SELECT * FROM files WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.auth!.userId,
    ]);
    if (!file) throw AppError.notFound();
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    if (file.mime_type) res.setHeader('Content-Type', file.mime_type);
    const stream = await objectStorage.getStream(file.storage_key);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

const renameSchema = z.object({ name: z.string().min(1).max(256).optional(), folderId: z.string().uuid().nullable().optional() });
filesRouter.patch('/:id', validate('body', renameSchema), async (req, res, next) => {
  try {
    const b = req.body as z.infer<typeof renameSchema>;
    const file = await queryOne(
      `UPDATE files SET name = COALESCE($1, name), folder_id = COALESCE($2, folder_id)
       WHERE id = $3 AND user_id = $4 RETURNING *`,
      [b.name, b.folderId, req.params.id, req.auth!.userId]
    );
    if (!file) throw AppError.notFound();
    res.json({ file });
  } catch (err) {
    next(err);
  }
});

filesRouter.delete('/:id', async (req, res, next) => {
  try {
    const file = await queryOne<FileRow>('SELECT * FROM files WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.auth!.userId,
    ]);
    if (!file) throw AppError.notFound();
    await objectStorage.delete(file.storage_key);
    await query('DELETE FROM files WHERE id = $1 AND user_id = $2', [req.params.id, req.auth!.userId]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
