import { execFile, spawn } from 'child_process';
import { promisify } from 'util';
import type { Writable } from 'stream';
import { logger } from '../utils/logger';

const execFileAsync = promisify(execFile);

/**
 * This whole module is the least-tested part of the project: it shells out to
 * `pactl`/`ffmpeg` and depends on PulseAudio being reachable (see
 * docker-entrypoint.sh). If audio doesn't come through, this is the first
 * place to check - run `pactl list sinks` and `ffmpeg -f pulse -i <sink>.monitor -t 2 -f null -`
 * by hand inside the backend container to see which half is failing.
 */

function sinkNameFor(sessionId: string): string {
  // PulseAudio object names are picky about characters; keep it to
  // alphanumerics. Collisions are practically impossible (same source as the
  // session id itself).
  return `avc_${sessionId.replace(/-/g, '')}`;
}

const moduleIdBySession = new Map<string, string>();

export async function createSessionSink(sessionId: string): Promise<string> {
  const sinkName = sinkNameFor(sessionId);
  try {
    const { stdout } = await execFileAsync('pactl', [
      'load-module',
      'module-null-sink',
      `sink_name=${sinkName}`,
      `sink_properties=device.description=${sinkName}`,
    ]);
    moduleIdBySession.set(sessionId, stdout.trim());
  } catch (err) {
    logger.error('Failed to create PulseAudio sink - audio will be unavailable for this session', {
      sessionId,
      error: String(err),
    });
  }
  return sinkName;
}

export async function destroySessionSink(sessionId: string): Promise<void> {
  const moduleId = moduleIdBySession.get(sessionId);
  if (!moduleId) return;
  moduleIdBySession.delete(sessionId);
  await execFileAsync('pactl', ['unload-module', moduleId]).catch((err) =>
    logger.error('Failed to unload PulseAudio sink', { sessionId, error: String(err) })
  );
}

export function getSinkName(sessionId: string): string {
  return sinkNameFor(sessionId);
}

/**
 * Spawns an ffmpeg process capturing this session's sink and pipes MP3-encoded
 * output directly into `out` (an HTTP response). Returns a stop() function -
 * callers MUST call it when the client disconnects, or the ffmpeg process
 * leaks for the lifetime of the container.
 */
export function streamSessionAudio(sessionId: string, out: Writable): { stop: () => void } {
  const sink = sinkNameFor(sessionId);
  const ffmpeg = spawn('ffmpeg', [
    '-f', 'pulse',
    '-i', `${sink}.monitor`,
    '-ac', '2',
    '-ar', '44100',
    '-f', 'mp3',
    '-b:a', '128k',
    'pipe:1',
  ]);

  ffmpeg.stdout.pipe(out);
  ffmpeg.stderr.on('data', () => {
    // ffmpeg is chatty on stderr even when healthy; only surface it if it
    // exits non-zero (below), rather than logging every line.
  });
  ffmpeg.on('error', (err) => {
    logger.error('Failed to start ffmpeg for audio capture', { sessionId, error: String(err) });
  });
  ffmpeg.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      logger.warn('ffmpeg audio capture exited unexpectedly', { sessionId, code });
    }
  });

  return {
    stop: () => {
      ffmpeg.stdout.unpipe(out);
      ffmpeg.kill('SIGTERM');
    },
  };
}
