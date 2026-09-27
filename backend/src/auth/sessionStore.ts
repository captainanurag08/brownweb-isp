import { createClient, type RedisClientType } from 'redis';
import { RedisStore } from 'connect-redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const redisClient: RedisClientType = createClient({ url: env.redisUrl });

redisClient.on('error', (err) => {
  logger.error('Redis client error', { error: String(err) });
});

export async function connectRedis(): Promise<void> {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
}

export const SESSION_PREFIX = 'sess:';

export const sessionStore = new RedisStore({
  client: redisClient,
  prefix: SESSION_PREFIX,
});

const userSessionsKey = (userId: string) => `user_sessions:${userId}`;
const sessionMetaKey = (sid: string) => `session_meta:${sid}`;

export interface SessionMeta {
  userAgent: string;
  ip: string;
  createdAt: string;
  lastSeenAt: string;
}

/** Called on successful login: index this session under the user so it can be listed/revoked later. */
export async function trackSession(userId: string, sid: string, meta: SessionMeta): Promise<void> {
  await redisClient.sAdd(userSessionsKey(userId), sid);
  await redisClient.hSet(sessionMetaKey(sid), { ...meta });
}

/** Called periodically on authenticated requests to keep "last seen" fresh. */
export async function touchSession(sid: string): Promise<void> {
  await redisClient.hSet(sessionMetaKey(sid), { lastSeenAt: new Date().toISOString() });
}

export async function untrackSession(userId: string, sid: string): Promise<void> {
  await redisClient.sRem(userSessionsKey(userId), sid);
  await redisClient.del(sessionMetaKey(sid));
}

export interface ActiveSession {
  id: string;
  isCurrent: boolean;
  meta: SessionMeta | null;
}

export async function listActiveSessions(userId: string, currentSid: string): Promise<ActiveSession[]> {
  const ids = await redisClient.sMembers(userSessionsKey(userId));
  const sessions: ActiveSession[] = [];
  for (const id of ids) {
    const raw = await redisClient.hGetAll(sessionMetaKey(id));
    const meta = raw && raw.userAgent ? (raw as unknown as SessionMeta) : null;
    // A session with no metadata and no live session record is stale; skip it
    // rather than showing a ghost entry, but don't mutate state here.
    if (!meta) continue;
    sessions.push({ id, isCurrent: id === currentSid, meta });
  }
  return sessions.sort((a, b) => (a.meta!.lastSeenAt < b.meta!.lastSeenAt ? 1 : -1));
}

/** Force-destroys a specific session by id (used for "log out this device"). */
export async function destroySessionById(userId: string, sid: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    sessionStore.destroy(sid, (err) => (err ? reject(err) : resolve()));
  });
  await untrackSession(userId, sid);
}

export async function destroyAllOtherSessions(userId: string, keepSid: string): Promise<number> {
  const ids = await redisClient.sMembers(userSessionsKey(userId));
  let count = 0;
  for (const id of ids) {
    if (id === keepSid) continue;
    await destroySessionById(userId, id);
    count += 1;
  }
  return count;
}
