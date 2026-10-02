import path from 'path';
import crypto from 'crypto';

import {
  query,
  queryOne,
} from '../db/pool';

import {
  PlaywrightContextEngine,
} from './PlaywrightContextEngine';

import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

import type {
  BrowserSessionRow,
  SessionMode,
} from '../types';

export class SessionManager {
  private activity =
    new Map<string, number>();

  constructor(
    private readonly engine: PlaywrightContextEngine,
  ) {}

  private profileDirFor(
    userId: string,
    sessionId: string,
    mode: SessionMode,
  ): string {
    const root =
      mode === 'private'
        ? '/tmp/avc-private'
        : env.profilesPath;

    return path.join(
      root,
      userId,
      sessionId,
    );
  }

  private async ensureEngineTabsPersisted(
    sessionId: string,
  ): Promise<void> {
    if (!this.engine.hasSession(sessionId)) {
      return;
    }

    const tabs =
      this.engine.getTabs(sessionId);

    if (tabs.length === 0) {
      return;
    }

    /*
     * The Playwright engine is now responsible for creating
     * browser_tabs rows.
     *
     * This cleanup handles rows left behind by an older backend
     * version or an interrupted restart.
     */
    const engineTabIds =
      tabs.map((tab) => tab.id);

    await query(
      `
      DELETE FROM browser_tabs
      WHERE session_id = $1
        AND NOT (id = ANY($2::uuid[]))
      `,
      [
        sessionId,
        engineTabIds,
      ],
    ).catch((err) => {
      logger.warn(
        'Failed to clean stale browser tabs',
        {
          sessionId,
          error: String(err),
        },
      );
    });
  }

  async getOrCreateSession(
    userId: string,
    deviceId: string,
    mode: SessionMode,
  ): Promise<BrowserSessionRow> {
    const existing =
      await queryOne<BrowserSessionRow>(
        `
        SELECT *
        FROM browser_sessions
        WHERE user_id = $1
          AND status IN (
            'starting',
            'running',
            'idle'
          )
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [userId],
      );

    if (existing) {
      if (
        !this.engine.hasSession(
          existing.id,
        )
      ) {
        try {
          await this.engine.createSession(
            existing.id,
            {
              mode: existing.mode,
              profileDir:
                existing.profile_path,
            },
          );

          const tabs =
            this.engine.getTabs(
              existing.id,
            );

          if (tabs.length === 0) {
            await this.engine.newTab(
              existing.id,
              'https://www.google.com/',
            );
          }

          await query(
            `
            UPDATE browser_sessions
            SET
              status = 'running',
              last_activity_at = now()
            WHERE id = $1
            `,
            [existing.id],
          );

          existing.status =
            'running';

          await this.ensureEngineTabsPersisted(
            existing.id,
          );
        } catch (err) {
          logger.error(
            'Failed to recover browser session',
            {
              sessionId: existing.id,
              error: String(err),
            },
          );

          await query(
            `
            UPDATE browser_sessions
            SET status = 'crashed'
            WHERE id = $1
            `,
            [existing.id],
          ).catch(() => undefined);

          throw AppError.badRequest(
            'Browser session unavailable.',
            'session_recovery_failed',
          );
        }
      }

      this.activity.set(
        existing.id,
        Date.now(),
      );

      return existing;
    }

    const activeCount =
      await queryOne<{ count: string }>(
        `
        SELECT count(*)::text AS count
        FROM browser_sessions
        WHERE user_id = $1
          AND status IN (
            'starting',
            'running',
            'idle'
          )
        `,
        [userId],
      );

    if (
      activeCount &&
      parseInt(
        activeCount.count,
        10,
      ) >= env.maxSessionsPerUser
    ) {
      throw AppError.tooMany(
        'This virtual computer has reached its resource limit. End the other session first.',
        'session_limit_reached',
      );
    }

    const sessionId =
      crypto.randomUUID();

    const profileDir =
      this.profileDirFor(
        userId,
        sessionId,
        mode,
      );

    const row =
      await queryOne<BrowserSessionRow>(
        `
        INSERT INTO browser_sessions
          (
            id,
            user_id,
            device_id,
            mode,
            status,
            profile_path
          )
        VALUES
          (
            $1,
            $2,
            $3,
            $4,
            'starting',
            $5
          )
        RETURNING *
        `,
        [
          sessionId,
          userId,
          deviceId,
          mode,
          profileDir,
        ],
      );

    if (!row) {
      throw new Error(
        'Failed to create browser session row',
      );
    }

    try {
      await this.engine.createSession(
        sessionId,
        {
          mode,
          profileDir,
        },
      );

      await this.engine.newTab(
        sessionId,
        'https://www.google.com/',
      );

      await query(
        `
        UPDATE browser_sessions
        SET
          status = 'running',
          last_activity_at = now()
        WHERE id = $1
        `,
        [sessionId],
      );

      row.status = 'running';

      this.activity.set(
        sessionId,
        Date.now(),
      );

      await this.ensureEngineTabsPersisted(
        sessionId,
      );

      return row;
    } catch (err) {
      await query(
        `
        UPDATE browser_sessions
        SET status = 'crashed'
        WHERE id = $1
        `,
        [sessionId],
      ).catch(() => undefined);

      await this.engine
        .destroySession(sessionId)
        .catch(() => undefined);

      logger.error(
        'Failed to start browser session',
        {
          sessionId,
          error: String(err),
        },
      );

      throw AppError.badRequest(
        'Browser session unavailable.',
        'session_start_failed',
      );
    }
  }

  touch(
    sessionId: string,
  ): void {
    this.activity.set(
      sessionId,
      Date.now(),
    );
  }

  async flushActivity(): Promise<void> {
    if (
      this.activity.size === 0
    ) {
      return;
    }

    const entries =
      [...this.activity.entries()];

    this.activity.clear();

    await query(
      `
      UPDATE browser_sessions
      SET last_activity_at = data.ts
      FROM (
        SELECT *
        FROM unnest(
          $1::uuid[],
          $2::timestamptz[]
        ) AS t(id, ts)
      ) AS data
      WHERE browser_sessions.id =
        data.id
      `,
      [
        entries.map(
          ([id]) => id,
        ),
        entries.map(
          ([, ts]) =>
            new Date(ts),
        ),
      ],
    ).catch((err) =>
      logger.error(
        'Failed to flush session activity',
        {
          error: String(err),
        },
      ),
    );
  }

  async stopSession(
    sessionId: string,
  ): Promise<void> {
    await this.engine.stopSession(
      sessionId,
    );

    await query(
      `
      UPDATE browser_sessions
      SET
        status = 'stopped',
        stopped_at = now()
      WHERE id = $1
      `,
      [sessionId],
    );
  }

  async destroySession(
    sessionId: string,
  ): Promise<void> {
    const row =
      await queryOne<BrowserSessionRow>(
        `
        SELECT *
        FROM browser_sessions
        WHERE id = $1
        `,
        [sessionId],
      );

    if (
      this.engine.hasSession(
        sessionId,
      )
    ) {
      await this.engine.destroySession(
        sessionId,
      );
    } else if (row) {
      await this.engine.deleteProfileDir(
        row.profile_path,
      );

      await query(
        `
        DELETE FROM browser_tabs
        WHERE session_id = $1
        `,
        [sessionId],
      ).catch(() => undefined);
    }

    await query(
      `
      UPDATE browser_sessions
      SET
        status = 'destroyed',
        destroyed_at = now()
      WHERE id = $1
      `,
      [sessionId],
    );

    this.activity.delete(
      sessionId,
    );
  }

  async sweepIdleSessions(): Promise<void> {
    await this.flushActivity();

    const idlePersistent =
      await query<BrowserSessionRow>(
        `
        SELECT *
        FROM browser_sessions
        WHERE status IN (
          'running',
          'idle'
        )
          AND mode = 'persistent'
          AND last_activity_at <
            now() -
            ($1 || ' minutes')::interval
        `,
        [
          env.sessionIdleTimeoutMinutes,
        ],
      );

    for (
      const session of idlePersistent
    ) {
      logger.info(
        'Stopping idle persistent session',
        {
          sessionId:
            session.id,
        },
      );

      await this.stopSession(
        session.id,
      ).catch((err) =>
        logger.error(
          'Failed to stop idle session',
          {
            sessionId:
              session.id,
            error: String(err),
          },
        ),
      );
    }

    const idlePrivate =
      await query<BrowserSessionRow>(
        `
        SELECT *
        FROM browser_sessions
        WHERE status IN (
          'running',
          'idle'
        )
          AND mode = 'private'
          AND last_activity_at <
            now() -
            ($1 || ' minutes')::interval
        `,
        [
          env.privateSessionTimeoutMinutes,
        ],
      );

    for (
      const session of idlePrivate
    ) {
      logger.info(
        'Destroying idle private session',
        {
          sessionId:
            session.id,
        },
      );

      await this.destroySession(
        session.id,
      ).catch((err) =>
        logger.error(
          'Failed to destroy idle session',
          {
            sessionId:
              session.id,
            error: String(err),
          },
        ),
      );
    }
  }
}
