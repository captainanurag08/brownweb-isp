import { env } from '../config/env';

type Level = 'debug' | 'info' | 'warn' | 'error';

const REDACT_KEYS = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'token',
  'sessionCookie',
  'cookie',
  'authorization',
  'csrfSecret',
  'pin',
  'pinHash',
]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = REDACT_KEYS.has(key) ? '[redacted]' : redact(val);
    }
    return out;
  }
  return value;
}

function write(level: Level, message: string, meta?: Record<string, unknown>) {
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(meta ? (redact(meta) as Record<string, unknown>) : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/**
 * Optionally truncates a URL for logging. Full URLs can reveal sensitive query
 * strings (search terms, tokens). This is configurable via LOG_FULL_URLS so an
 * operator can choose a more private logging posture.
 */
export function loggableUrl(url: string): string {
  if (env.logFullUrls) return url;
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return '[unparseable-url]';
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
};
