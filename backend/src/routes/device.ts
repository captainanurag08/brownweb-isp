import { Router } from 'express';
import { z } from 'zod';
import { queryOne, query } from '../db/pool';
import { requireAuth } from '../auth/middleware';
import { validate } from '../middleware/validate';
import { hashPassword, verifyPassword } from '../auth/password';
import { AppError } from '../utils/AppError';
import type { Device } from '../types';

export const deviceRouter = Router();
deviceRouter.use(requireAuth);

deviceRouter.get('/', async (req, res, next) => {
  try {
    const device = await queryOne<Device>('SELECT * FROM devices WHERE id = $1', [req.auth!.deviceId]);
    const settings = await queryOne('SELECT * FROM device_settings WHERE device_id = $1', [req.auth!.deviceId]);
    if (!device) throw AppError.notFound();
    res.json({ device, settings });
  } catch (err) {
    next(err);
  }
});

const patchSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  wallpaper: z.string().max(64).optional(),
  theme: z.enum(['system', 'light', 'dark']).optional(),
  accentColor: z.string().max(32).optional(),
  timezone: z.string().max(64).optional(),
  language: z.string().max(16).optional(),
  homepage: z.string().url().max(2048).optional(),
  searchEngine: z.enum(['google', 'bing', 'duckduckgo']).optional(),
  sessionMode: z.enum(['persistent', 'private']).optional(),
  firstRunComplete: z.boolean().optional(),
});

deviceRouter.patch('/', validate('body', patchSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof patchSchema>;
    const device = await queryOne<Device>(
      `UPDATE devices SET
         name = COALESCE($1, name),
         wallpaper = COALESCE($2, wallpaper),
         theme = COALESCE($3, theme),
         accent_color = COALESCE($4, accent_color),
         timezone = COALESCE($5, timezone),
         language = COALESCE($6, language),
         homepage = COALESCE($7, homepage),
         search_engine = COALESCE($8, search_engine),
         session_mode = COALESCE($9, session_mode),
         first_run_complete = COALESCE($10, first_run_complete),
         updated_at = now()
       WHERE id = $11
       RETURNING *`,
      [
        body.name, body.wallpaper, body.theme, body.accentColor, body.timezone,
        body.language, body.homepage, body.searchEngine, body.sessionMode,
        body.firstRunComplete, req.auth!.deviceId,
      ]
    );
    res.json({ device });
  } catch (err) {
    next(err);
  }
});

const setPinSchema = z.object({ pin: z.string().min(4).max(12) });
deviceRouter.post('/lock/set-pin', validate('body', setPinSchema), async (req, res, next) => {
  try {
    const { pin } = req.body as z.infer<typeof setPinSchema>;
    const pinHash = await hashPassword(pin);
    await query('UPDATE devices SET pin_hash = $1 WHERE id = $2', [pinHash, req.auth!.deviceId]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

deviceRouter.delete('/lock/set-pin', async (req, res, next) => {
  try {
    await query('UPDATE devices SET pin_hash = NULL WHERE id = $1', [req.auth!.deviceId]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

const verifyPinSchema = z.object({ pin: z.string().min(1).max(12) });
deviceRouter.post('/lock/verify', validate('body', verifyPinSchema), async (req, res, next) => {
  try {
    const { pin } = req.body as z.infer<typeof verifyPinSchema>;
    const device = await queryOne<Device>('SELECT pin_hash FROM devices WHERE id = $1', [req.auth!.deviceId]);
    if (!device?.pin_hash) {
      return res.json({ ok: true }); // no PIN configured: nothing to unlock
    }
    const ok = await verifyPassword(pin, device.pin_hash);
    res.json({ ok });
  } catch (err) {
    next(err);
  }
});

const deviceSettingsSchema = z.object({
  autoLockMinutes: z.number().int().min(0).max(240).optional(),
  defaultZoom: z.number().min(0.5).max(3).optional(),
  startupRestoreTabs: z.boolean().optional(),
  maxTabs: z.number().int().min(1).max(50).optional(),
});
deviceRouter.patch('/settings', validate('body', deviceSettingsSchema), async (req, res, next) => {
  try {
    const b = req.body as z.infer<typeof deviceSettingsSchema>;
    const settings = await queryOne(
      `UPDATE device_settings SET
         auto_lock_minutes = COALESCE($1, auto_lock_minutes),
         default_zoom = COALESCE($2, default_zoom),
         startup_restore_tabs = COALESCE($3, startup_restore_tabs),
         max_tabs = COALESCE($4, max_tabs),
         updated_at = now()
       WHERE device_id = $5
       RETURNING *`,
      [b.autoLockMinutes, b.defaultZoom, b.startupRestoreTabs, b.maxTabs, req.auth!.deviceId]
    );
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});
