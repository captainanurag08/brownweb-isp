import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { promisify } from 'util';
import type { Writable } from 'stream';
import { logger } from '../utils/logger';

const execFileAsync = promisify(execFile);

const moduleIdBySession = new Map<string, string>();

function sinkNameFor(sessionId: string): string {
  return `avc_${sessionId.replace(/[^a-zA-Z0-9]/g, '')}`;
}

function pulseEnvironment(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PULSE_SERVER:
      process.env.PULSE_SERVER ??
      'unix:/tmp/runtime-pwuser/pulse/native',
  };
}

async function pulseCommand(
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync('pactl', args, {
    env: pulseEnvironment(),
  });
}

async function sinkExists(sinkName: string): Promise<boolean> {
  try {
    const { stdout } = await pulseCommand([
      'list',
      'short',
      'sinks',
    ]);

    return stdout
      .split('\n')
      .some((line) => line.includes(sinkName));
  } catch {
    return false;
  }
}

async function sourceExists(sourceName: string): Promise<boolean> {
  try {
    const { stdout } = await pulseCommand([
      'list',
      'short',
      'sources',
    ]);

    return stdout
      .split('\n')
      .some((line) => line.includes(sourceName));
  } catch {
    return false;
  }
}

export async function createSessionSink(
  sessionId: string,
): Promise<string> {
  const sinkName = sinkNameFor(sessionId);

  try {
    /*
     * If a sink from a previous attempt still exists, reuse it.
     */
    if (await sinkExists(sinkName)) {
      logger.info('PulseAudio session sink already exists', {
        sessionId,
        sinkName,
      });

      return sinkName;
    }

    const { stdout } = await pulseCommand([
      'load-module',
      'module-null-sink',
      `sink_name=${sinkName}`,
      `sink_properties=device.description=${sinkName}`,
      'rate=44100',
      'channels=2',
    ]);

    const moduleId = stdout.trim();

    if (!moduleId) {
      throw new Error('PulseAudio did not return a module id');
    }

    moduleIdBySession.set(sessionId, moduleId);

    /*
     * Give PulseAudio a moment to register the monitor source.
     */
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (await sourceExists(`${sinkName}.monitor`)) {
        logger.info('PulseAudio session sink ready', {
          sessionId,
          sinkName,
          monitor: `${sinkName}.monitor`,
          moduleId,
        });

        return sinkName;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(
      `PulseAudio monitor ${sinkName}.monitor was not created`,
    );
  } catch (err) {
    logger.error(
      'Failed to create PulseAudio sink - audio will be unavailable for this session',
      {
        sessionId,
        sinkName,
        error: String(err),
      },
    );

    return sinkName;
  }
}

export async function destroySessionSink(
  sessionId: string,
): Promise<void> {
  const moduleId = moduleIdBySession.get(sessionId);

  if (!moduleId) {
    return;
  }

  moduleIdBySession.delete(sessionId);

  try {
    await pulseCommand([
      'unload-module',
      moduleId,
    ]);
  } catch (err) {
    logger.error('Failed to unload PulseAudio sink', {
      sessionId,
      moduleId,
      error: String(err),
    });
  }
}

export function getSinkName(sessionId: string): string {
  return sinkNameFor(sessionId);
}

export function streamSessionAudio(
  sessionId: string,
  out: Writable,
): { stop: () => void } {
  const sink = sinkNameFor(sessionId);
  const monitor = `${sink}.monitor`;

  let stopped = false;

  const ffmpeg: ChildProcessWithoutNullStreams = spawn(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'warning',

      '-f',
      'pulse',

      '-i',
      monitor,

      '-ac',
      '2',

      '-ar',
      '44100',

      '-c:a',
      'libmp3lame',

      '-b:a',
      '128k',

      '-f',
      'mp3',

      'pipe:1',
    ],
    {
      env: {
        ...pulseEnvironment(),

        /*
         * Explicitly tell FFmpeg which PulseAudio source to use.
         * This avoids relying on PulseAudio's default source.
         */
        PULSE_SOURCE: monitor,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  ffmpeg.stdout.pipe(out);

  let stderrBuffer = '';

  ffmpeg.stderr.on('data', (chunk: Buffer | string) => {
    const text = chunk.toString();

    stderrBuffer += text;

    /*
     * Prevent a broken FFmpeg process from filling memory.
     */
    if (stderrBuffer.length > 8000) {
      stderrBuffer = stderrBuffer.slice(-8000);
    }
  });

  ffmpeg.on('error', (err) => {
    logger.error('Failed to start ffmpeg for audio capture', {
      sessionId,
      sink,
      monitor,
      error: String(err),
    });
  });

  ffmpeg.on('exit', (code, signal) => {
    if (stopped) {
      return;
    }

    if (code !== 0 && code !== null) {
      logger.warn('ffmpeg audio capture exited unexpectedly', {
        sessionId,
        sink,
        monitor,
        code,
        signal,
        stderr: stderrBuffer.trim(),
      });
    }
  });

  return {
    stop: () => {
      if (stopped) {
        return;
      }

      stopped = true;

      try {
        ffmpeg.stdout.unpipe(out);
      } catch {
        // Ignore.
      }

      if (!ffmpeg.killed) {
        ffmpeg.kill('SIGTERM');
      }
    },
  };
}
