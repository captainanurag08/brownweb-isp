import path from 'path';
import crypto from 'crypto';
import { query, queryOne } from '../db/pool';
import { PlaywrightContextEngine } from './PlaywrightContextEngine';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';
import type { BrowserSessionRow, SessionMode } from '../types';

export class SessionManager {
  // In-memory activity tracking: touch() is called on every WebSocket
  // message, including high-frequency mouse-move events, so it must be
  // free. The previous version awaited a Postgres UPDATE here, which put a
  // full DB round-trip in front of every single input event - the main
  // cause of sluggish input. Real timestamps are flushed to Postgres in a
  // batch periodically instead (see flushActivity), which is all the idle
  // sweep actually needs.
  private activity = new Map<string, number>();

  constructor(private readonly engine: PlaywrightContextEngine) {}

  private profileDirFor(userId: string, sessionId: string, mode: SessionMode): string {
    const root = mode === 'private' ? '/tmp/avc-private' : env.profilesPath;
    return path.join(root, userId, sessionId);
  }

  /**
   * Returns the user's existing running session if one exists, otherwise
   * creates a new one — enforcing MAX_SESSIONS_PER_USER in the process.
   */
  async getOrCreateSession(userId: string, deviceId: string, mode: SessionMode): Promise<BrowserSessionRow> {
    const existing = await queryOne<BrowserSessionRow>(
      `SELECT * FROM browser_sessions WHERE user_id = $1 AND status IN ('starting','running','idle') ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (existing) {
      if (!this.engine.hasSession(existing.id)) {
        // Backend restarted, or the browser crashed and wasn't cleaned up.
        // Restart it in place rather than creating a second row.
        await this.engine.createSession(existing.id, { mode: existing.mode, profileDir: existing.profile_path });
        const tabs = this.engine.getTabs(existing.id);
        if (tabs.length === 0) {
          await this.engine.newTab(existing.id, 'https://www.google.com/');
        }
        await query(`UPDATE browser_sessions SET status = 'running', last_activity_at = now() WHERE id = $1`, [
          existing.id,
        ]);
      }
      this.activity.set(existing.id, Date.now());
      return existing;
    }

    const activeCount = await queryOne<{ count: string }>(
      `SELECT count(*)::text as count FROM browser_sessions WHERE user_id = $1 AND status IN ('starting','running','idle')`,
      [userId]
    );
    if (activeCount && parseInt(activeCount.count, 10) >= env.maxSessionsPerUser) {
      throw AppError.tooMany(
        'This virtual computer has reached its resource limit. End the other session first.',
        'session_limit_reached'
      );
    }

    const sessionId = crypto.randomUUID();
    const profileDir = this.profileDirFor(userId, sessionId, mode);

    const row = await queryOne<BrowserSessionRow>(
      `INSERT INTO browser_sessions (id, user_id, device_id, mode, status, profile_path) VALUES ($1, $2, $3, $4, 'starting', $5) RETURNING *`,
      [sessionId, userId, deviceId, mode, profileDir]
    );
    if (!row) throw new Error('Failed to create browser session row');

    try {
      await this.engine.createSession(sessionId, { mode, profileDir });
      await this.engine.newTab(sessionId, 'https://www.google.com/');
      await query(`UPDATE browser_sessions SET status = 'running' WHERE id = $1`, [sessionId]);
      row.status = 'running';
      this.activity.set(sessionId, Date.now());
    } catch (err) {
      await query(`UPDATE browser_sessions SET status = 'crashed' WHERE id = $1`, [sessionId]);
      logger.error('Failed to start browser session', { sessionId, error: String(err) });
      throw AppError.badRequest('Browser session unavailable.', 'session_start_failed');
    }

    return row;
  }

  /** Cheap, synchronous activity marker - safe to call on every input event. */
  touch(sessionId: string): void {
    this.activity.set(sessionId, Date.now());
  }

  /** Batches the in-memory activity timestamps into Postgres. Call this on an interval, not per-event. */
  async flushActivity(): Promise<void> {
    if (this.activity.size === 0) return;
    const entries = [...this.activity.entries()];
    this.activity.clear();
    await query(
      `UPDATE browser_sessions SET last_activity_at = data.ts
       FROM (SELECT * FROM unnest($1::uuid[], $2::timestamptz[]) AS t(id, ts)) AS data
       WHERE browser_sessions.id = data.id`,
      [entries.map(([id]) => id), entries.map(([, ts]) => new Date(ts))]
    ).catch((err) => logger.error('Failed to flush session activity', { error: String(err) }));
  }

  /** Stops the browser process but keeps the profile on disk (persistent mode). */
  async stopSession(sessionId: string): Promise<void> {
    await this.engine.stopSession(sessionId);
    await query(`UPDATE browser_sessions SET status = 'stopped', stopped_at = now() WHERE id = $1`, [sessionId]);
  }

  /** Permanently destroys the session and its profile data. Used by private-session end and the "Destroy" button. */
  async destroySession(sessionId: string): Promise<void> {
    const row = await queryOne<BrowserSessionRow>('SELECT * FROM browser_sessions WHERE id = $1', [sessionId]);
    if (this.engine.hasSession(sessionId)) {
      await this.engine.destroySession(sessionId);
    } else if (row) {
      await this.engine.deleteProfileDir(row.profile_path);
    }
    await query(`UPDATE browser_sessions SET status = 'destroyed', destroyed_at = now() WHERE id = $1`, [sessionId]);
  }

  /**
   * Periodic sweep: persistent sessions past the idle timeout are stopped
   * (profile kept); private sessions past their (shorter) timeout are fully
   * destroyed. Call this on an interval from index.ts.
   */
  async sweepIdleSessions(): Promise<void> {
    await this.flushActivity();

    const idlePersistent = await query<BrowserSessionRow>(
      `SELECT * FROM browser_sessions WHERE status IN ('running','idle') AND mode = 'persistent'
       AND last_activity_at < now() - ($1 || ' minutes')::interval`,
      [env.sessionIdleTimeoutMinutes]
    );
    for (const session of idlePersistent) {
      logger.info('Stopping idle persistent session', { sessionId: session.id });
      await this.stopSession(session.id).catch((err) =>
        logger.error('Failed to stop idle session', { sessionId: session.id, error: String(err) })
      );
    }

    const idlePrivate = await query<BrowserSessionRow>(
      `SELECT * FROM browser_sessions WHERE status IN ('running','idle') AND mode = 'private'
       AND last_activity_at < now() - ($1 || ' minutes')::interval`,
      [env.privateSessionTimeoutMinutes]
    );
    for (const session of idlePrivate) {
      logger.info('Destroying idle private session', { sessionId: session.id });
      await this.destroySession(session.id).catch((err) =>
        logger.error('Failed to destroy idle private session', { sessionId: session.id, error: String(err) })
      );
    }
  }
}
