import 'dotenv/config';
import path from 'path';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function bool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw === 'true' || raw === '1';
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: int('PORT', 4000),
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  trustProxy: bool('TRUST_PROXY', false),

  databaseUrl: required('DATABASE_URL', 'postgres://avc:avc_dev_password@localhost:5432/avc'),
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',

  sessionSecret: required('SESSION_SECRET', 'dev-only-insecure-secret-change-me'),
  sessionCookieName: 'avc.sid',
  csrfCookieName: 'avc.csrf',

  storageDriver: (process.env.STORAGE_DRIVER as 'local' | 's3') ?? 'local',
  storageLocalPath: process.env.STORAGE_LOCAL_PATH ?? path.join(process.cwd(), 'data', 'files'),
  storageEndpoint: process.env.STORAGE_ENDPOINT,
  storageBucket: process.env.STORAGE_BUCKET ?? 'avc-files',
  storageAccessKey: process.env.STORAGE_ACCESS_KEY,
  storageSecretKey: process.env.STORAGE_SECRET_KEY,
  storageQuotaMb: int('STORAGE_QUOTA_MB', 2048),

  profilesPath: process.env.PROFILES_PATH ?? path.join(process.cwd(), 'data', 'profiles'),

  maxSessionsPerUser: int('MAX_SESSIONS_PER_USER', 1),
  maxTabsPerSession: int('MAX_TABS_PER_SESSION', 15),
  sessionIdleTimeoutMinutes: int('SESSION_IDLE_TIMEOUT_MINUTES', 30),
  privateSessionTimeoutMinutes: int('PRIVATE_SESSION_TIMEOUT_MINUTES', 15),

  loginRateLimitMax: int('LOGIN_RATE_LIMIT_MAX', 5),
  loginRateLimitWindowMinutes: int('LOGIN_RATE_LIMIT_WINDOW_MINUTES', 15),
  lockoutThreshold: int('LOCKOUT_THRESHOLD', 5),
  lockoutDurationMinutes: int('LOCKOUT_DURATION_MINUTES', 15),

  historyRetentionDays: int('HISTORY_RETENTION_DAYS', 90),
  logFullUrls: bool('LOG_FULL_URLS', true),

  screencastQuality: int('SCREENCAST_QUALITY', 60),
  screencastMaxWidth: int('SCREENCAST_MAX_WIDTH', 1440),
  screencastMaxHeight: int('SCREENCAST_MAX_HEIGHT', 900),

  // Headless Chromium does not reliably produce capturable audio output, so
  // audio support requires running headful inside a virtual display (Xvfb) -
  // see docker-entrypoint.sh and docs/DEPLOYMENT.md. Set to true to go back
  // to lighter-weight headless mode if you don't need in-browser audio.
  browserHeadless: bool('BROWSER_HEADLESS', false),
  audioEnabled: bool('AUDIO_ENABLED', true),
};

export type Env = typeof env;
