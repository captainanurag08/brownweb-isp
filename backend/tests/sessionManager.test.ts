import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB layer so this test never touches a real Postgres instance.
// SessionManager talks to it through query/queryOne only, so a small mock is
// enough to exercise the resource-limit decision logic in isolation.
vi.mock('../src/db/pool', () => {
  const rows: Record<string, unknown>[] = [];
  return {
    query: vi.fn(async (sql: string) => {
      if (sql.includes('count(*)')) {
        return [{ count: String(rows.length) }];
      }
      if (sql.startsWith('SELECT * FROM browser_sessions')) {
        return rows;
      }
      return [];
    }),
    queryOne: vi.fn(async (sql: string, params: unknown[]) => {
      if (sql.startsWith('INSERT INTO browser_sessions')) {
        const row = {
          id: params[0],
          user_id: params[1],
          device_id: params[2],
          mode: params[3],
          status: 'starting',
          profile_path: params[4],
        };
        rows.push(row);
        return row;
      }
      if (sql.startsWith('SELECT count(*)')) {
        return { count: String(rows.length) };
      }
      return null;
    }),
  };
});

const { SessionManager } = await import('../src/browser/SessionManager');

function fakeEngine() {
  return {
    hasSession: vi.fn(() => false),
    createSession: vi.fn(async () => undefined),
    newTab: vi.fn(async () => ({ id: 't1', url: 'https://www.google.com/', title: 'Google', favicon: null, isActive: true, position: 0 })),
    getTabs: vi.fn(() => []),
    stopSession: vi.fn(async () => undefined),
    destroySession: vi.fn(async () => undefined),
    deleteProfileDir: vi.fn(async () => undefined),
  } as unknown as import('../src/browser/PlaywrightContextEngine').PlaywrightContextEngine;
}

describe('SessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a session for a user with none active', async () => {
    const engine = fakeEngine();
    const manager = new SessionManager(engine);
    const row = await manager.getOrCreateSession('user-1', 'device-1', 'persistent');
    expect(row.user_id).toBe('user-1');
    expect(engine.createSession).toHaveBeenCalledTimes(1);
  });
});
