import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cookie from 'cookie';
import signature from 'cookie-signature';
import { z } from 'zod';

import { env } from '../config/env';
import { sessionStore } from '../auth/sessionStore';
import { SessionManager } from '../browser/SessionManager';
import { PlaywrightContextEngine } from '../browser/PlaywrightContextEngine';
import { normalizeUrl, type TabInfo } from '../browser/BrowserEngine';
import { query, queryOne } from '../db/pool';
import { logger, loggableUrl } from '../utils/logger';
import type { Device } from '../types';

const clientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('input.mouse'),
    tabId: z.string(),
    action: z.enum(['move', 'down', 'up', 'dblclick']),
    x: z.number(),
    y: z.number(),
    button: z.enum(['left', 'right', 'middle']).optional(),
  }),

  z.object({
    type: z.literal('input.wheel'),
    tabId: z.string(),
    deltaX: z.number(),
    deltaY: z.number(),
  }),

  z.object({
    type: z.literal('input.key'),
    tabId: z.string(),
    action: z.enum(['down', 'up']),
    key: z.string().max(64),
  }),

  z.object({
    type: z.literal('input.text'),
    tabId: z.string(),
    text: z.string().max(4000),
  }),

  z.object({
    type: z.literal('tab.new'),
    url: z.string().max(4000).optional(),
  }),

  z.object({
    type: z.literal('tab.close'),
    tabId: z.string(),
  }),

  z.object({
    type: z.literal('tab.switch'),
    tabId: z.string(),
  }),

  z.object({
    type: z.literal('tab.navigate'),
    tabId: z.string(),
    url: z.string().max(4000),
  }),

  z.object({
    type: z.literal('tab.back'),
    tabId: z.string(),
  }),

  z.object({
    type: z.literal('tab.forward'),
    tabId: z.string(),
  }),

  z.object({
    type: z.literal('tab.reload'),
    tabId: z.string(),
  }),

  z.object({
    type: z.literal('viewport.resize'),
    tabId: z.string(),
    width: z.number().int().positive().max(4096),
    height: z.number().int().positive().max(4096),
  }),
]);

interface ConnectionState {
  userId: string;
  deviceId: string;
  sessionId: string | null;
  socket: WebSocket;
}

function readSessionIdFromCookieHeader(
  cookieHeader: string | undefined
): string | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookie.parse(cookieHeader);
  const raw = cookies[env.sessionCookieName];

  if (!raw) {
    return null;
  }

  if (raw.startsWith('s:')) {
    const unsigned = signature.unsign(
      raw.slice(2),
      env.sessionSecret
    );

    return unsigned || null;
  }

  return raw;
}

function send(
  socket: WebSocket,
  payload: unknown
): void {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(payload));
}

const FRAME_MARKER = 0x01;
const MAX_BUFFERED_BYTES = 2 * 1024 * 1024;

function sendFrame(
  socket: WebSocket,
  tabId: string,
  jpeg: Buffer
): void {
  if (socket.readyState !== WebSocket.OPEN) {
    return;
  }

  if (socket.bufferedAmount > MAX_BUFFERED_BYTES) {
    return;
  }

  const header = Buffer.alloc(37);

  header[0] = FRAME_MARKER;
  header.write(tabId, 1, 36, 'ascii');

  socket.send(
    Buffer.concat([header, jpeg])
  );
}

async function recordHistory(
  userId: string,
  sessionId: string,
  tabId: string,
  url: string,
  title: string
): Promise<void> {
  if (url === 'about:blank') {
    return;
  }

  try {
    /*
     * Playwright tab IDs can exist in memory briefly after
     * their database record has disappeared. Check first so
     * the browser operation is never broken by the history FK.
     */
    const tab = await queryOne<{ id: string }>(
      `
      SELECT id
      FROM browser_tabs
      WHERE id = $1
        AND session_id = $2
      `,
      [tabId, sessionId]
    );

    if (!tab) {
      logger.warn('Skipping history for unknown browser tab', {
        sessionId,
        tabId,
        url: loggableUrl(url),
      });

      return;
    }

    await query(
      `
      INSERT INTO browser_history
        (user_id, session_id, tab_id, url, title)
      VALUES
        ($1, $2, $3, $4, $5)
      `,
      [
        userId,
        sessionId,
        tabId,
        url,
        title,
      ]
    );
  } catch (err) {
    logger.error('Failed to record history', {
      error: String(err),
    });
  }
}

export function attachWebSocketGateway(
  server: HttpServer,
  engine: PlaywrightContextEngine,
  sessionManager: SessionManager
): void {
  const wss = new WebSocketServer({
    server,
    path: '/ws',
  });

  const connectionsBySession =
    new Map<string, Set<ConnectionState>>();

  function broadcast(
    sessionId: string,
    payload: unknown
  ): void {
    for (
      const conn of
        connectionsBySession.get(sessionId) ?? []
    ) {
      send(conn.socket, payload);
    }
  }

  engine.on(
    'frame',
    (
      sessionId: string,
      tabId: string,
      jpeg: Buffer
    ) => {
      for (
        const conn of
          connectionsBySession.get(sessionId) ?? []
      ) {
        sendFrame(
          conn.socket,
          tabId,
          jpeg
        );
      }
    }
  );

  engine.on(
    'tabCreated',
    (
      sessionId: string,
      tab: TabInfo
    ) => {
      broadcast(sessionId, {
        type: 'tab.created',
        tab,
      });
    }
  );

  engine.on(
    'tabUpdated',
    (
      sessionId: string,
      tab: TabInfo
    ) => {
      broadcast(sessionId, {
        type: 'tab.updated',
        tab,
      });
    }
  );

  engine.on(
    'tabClosed',
    (
      sessionId: string,
      tabId: string
    ) => {
      broadcast(sessionId, {
        type: 'tab.closed',
        tabId,
      });
    }
  );

  engine.on(
    'navigation',
    (
      sessionId: string,
      tabId: string,
      url: string,
      title: string
    ) => {
      broadcast(sessionId, {
        type: 'navigation',
        tabId,
        url,
        title,
      });

      for (
        const conn of
          connectionsBySession.get(sessionId) ?? []
      ) {
        void recordHistory(
          conn.userId,
          sessionId,
          tabId,
          url,
          title
        );
      }

      logger.info('navigation', {
        sessionId,
        tabId,
        url: loggableUrl(url),
      });
    }
  );

  engine.on(
    'crashed',
    (sessionId: string) => {
      broadcast(sessionId, {
        type: 'error',
        message: 'Remote browser disconnected.',
        code: 'browser_crashed',
      });
    }
  );

  wss.on(
    'connection',
    async (socket, req) => {
      const sid =
        readSessionIdFromCookieHeader(
          req.headers.cookie
        );

      if (!sid) {
        socket.close(
          4001,
          'unauthenticated'
        );
        return;
      }

      sessionStore.get(
        sid,
        async (
          err: any,
          sessionData: any
        ) => {
          if (
            err ||
            !sessionData ||
            !sessionData.userId ||
            !sessionData.deviceId
          ) {
            socket.close(
              4001,
              'unauthenticated'
            );
            return;
          }

          const userId =
            sessionData.userId;

          const deviceId =
            sessionData.deviceId;

          const device =
            await queryOne<Device>(
              `
              SELECT *
              FROM devices
              WHERE id = $1
                AND user_id = $2
              `,
              [
                deviceId,
                userId,
              ]
            );

          if (!device) {
            socket.close(
              4001,
              'unauthenticated'
            );
            return;
          }

          const conn: ConnectionState = {
            userId,
            deviceId,
            sessionId: null,
            socket,
          };

          try {
            const row =
              await sessionManager.getOrCreateSession(
                userId,
                deviceId,
                device.session_mode
              );

            conn.sessionId = row.id;

            let set =
              connectionsBySession.get(
                row.id
              );

            if (!set) {
              set = new Set();
              connectionsBySession.set(
                row.id,
                set
              );
            }

            set.add(conn);

            send(socket, {
              type: 'session.ready',
              sessionId: row.id,
              tabs: engine.getTabs(row.id),
            });
          } catch (e) {
            send(socket, {
              type: 'error',
              message:
                e instanceof Error
                  ? e.message
                  : 'Browser session unavailable.',
            });

            socket.close(
              4002,
              'session_unavailable'
            );

            return;
          }

          socket.on(
            'message',
            async (raw) => {
              if (!conn.sessionId) {
                return;
              }

              let parsed: unknown;

              try {
                parsed =
                  JSON.parse(
                    raw.toString()
                  );
              } catch {
                send(socket, {
                  type: 'error',
                  message:
                    'Malformed message.',
                });

                return;
              }

              const result =
                clientMessageSchema.safeParse(
                  parsed
                );

              if (!result.success) {
                send(socket, {
                  type: 'error',
                  message:
                    'Unrecognized or invalid message.',
                });

                return;
              }

              const msg = result.data;
              const sessionId =
                conn.sessionId;

              try {
                sessionManager.touch(
                  sessionId
                );

                switch (msg.type) {
                  case 'input.mouse':
                    await engine.sendMouseEvent(
                      sessionId,
                      msg.tabId,
                      msg
                    );
                    break;

                  case 'input.wheel':
                    await engine.sendWheelEvent(
                      sessionId,
                      msg.tabId,
                      msg.deltaX,
                      msg.deltaY
                    );
                    break;

                  case 'input.key':
                    await engine.sendKeyEvent(
                      sessionId,
                      msg.tabId,
                      msg.action,
                      msg.key
                    );
                    break;

                  case 'input.text':
                    await engine.sendText(
                      sessionId,
                      msg.tabId,
                      msg.text
                    );
                    break;

                  case 'tab.new': {
                    const currentTabs =
                      engine.getTabs(
                        sessionId
                      );

                    if (
                      currentTabs.length >=
                      (await maxTabsFor(
                        deviceId
                      ))
                    ) {
                      send(socket, {
                        type: 'error',
                        message:
                          'This virtual computer has reached its tab limit.',
                      });

                      break;
                    }

                    const url =
                      normalizeUrl(
                        msg.url ??
                          device.homepage,
                        device.search_engine
                      );

                    await engine.newTab(
                      sessionId,
                      url
                    );

                    break;
                  }

                  case 'tab.close':
                    await engine.closeTab(
                      sessionId,
                      msg.tabId
                    );
                    break;

                  case 'tab.switch':
                    await engine.switchTab(
                      sessionId,
                      msg.tabId
                    );
                    break;

                  case 'tab.navigate':
                    await engine.navigate(
                      sessionId,
                      msg.tabId,
                      normalizeUrl(
                        msg.url,
                        device.search_engine
                      )
                    );
                    break;

                  case 'tab.back':
                    await engine.goBack(
                      sessionId,
                      msg.tabId
                    );
                    break;

                  case 'tab.forward':
                    await engine.goForward(
                      sessionId,
                      msg.tabId
                    );
                    break;

                  case 'tab.reload':
                    await engine.reload(
                      sessionId,
                      msg.tabId
                    );
                    break;

                  case 'viewport.resize':
                    await engine.resizeViewport(
                      sessionId,
                      msg.tabId,
                      msg.width,
                      msg.height
                    );
                    break;
                }
              } catch (e) {
                logger.error(
                  'Error handling WS message',
                  {
                    type: msg.type,
                    error: String(e),
                  }
                );

                send(socket, {
                  type: 'error',
                  message:
                    'The remote browser could not complete that action.',
                });
              }
            }
          );

          socket.on(
            'close',
            () => {
              if (conn.sessionId) {
                connectionsBySession
                  .get(conn.sessionId)
                  ?.delete(conn);
              }
            }
          );
        }
      );
    }
  );

  async function maxTabsFor(
    deviceId: string
  ): Promise<number> {
    const row =
      await queryOne<{ max_tabs: number }>(
        `
        SELECT max_tabs
        FROM device_settings
        WHERE device_id = $1
        `,
        [deviceId]
      );

    return (
      row?.max_tabs ??
      env.maxTabsPerSession
    );
  }
}
