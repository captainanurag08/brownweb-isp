import { execFile, spawn } from 'child_process';
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
): Promise<{
  stdout: string;
  stderr: string;
}> {
  return execFileAsync('pactl', args, {
    env: pulseEnvironment(),
  });
}

async function sinkExists(
  sinkName: string,
): Promise<boolean> {
  try {
    const { stdout } =
      await pulseCommand([
        'list',
        'short',
        'sinks',
      ]);

    return stdout
      .split('\n')
      .some((line) =>
        line.includes(sinkName),
      );
  } catch {
    return false;
  }
}

async function sourceExists(
  sourceName: string,
): Promise<boolean> {
  try {
    const { stdout } =
      await pulseCommand([
        'list',
        'short',
        'sources',
      ]);

    return stdout
      .split('\n')
      .some((line) =>
        line.includes(sourceName),
      );
  } catch {
    return false;
  }
}

export async function createSessionSink(
  sessionId: string,
): Promise<string> {
  const sinkName =
    sinkNameFor(sessionId);

  try {
    /*
     * Reuse the sink if it already exists.
     */
    if (
      await sinkExists(sinkName)
    ) {
      logger.info(
        'PulseAudio session sink already exists',
        {
          sessionId,
          sinkName,
        },
      );

      return sinkName;
    }

    /*
     * Create a virtual/null sink for this
     * browser session.
     */
    const { stdout } =
      await pulseCommand([
        'load-module',
        'module-null-sink',
        `sink_name=${sinkName}`,
        `sink_properties=device.description=${sinkName}`,
        'rate=44100',
        'channels=2',
      ]);

    const moduleId =
      stdout.trim();

    if (!moduleId) {
      throw new Error(
        'PulseAudio did not return a module id',
      );
    }

    moduleIdBySession.set(
      sessionId,
      moduleId,
    );

    /*
     * Wait for the monitor source to become
     * available.
     */
    for (
      let attempt = 0;
      attempt < 20;
      attempt += 1
    ) {
      if (
        await sourceExists(
          `${sinkName}.monitor`,
        )
      ) {
        logger.info(
          'PulseAudio session sink ready',
          {
            sessionId,
            sinkName,
            monitor:
              `${sinkName}.monitor`,
            moduleId,
          },
        );

        return sinkName;
      }

      await new Promise(
        (resolve) =>
          setTimeout(resolve, 100),
      );
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

    /*
     * Return the expected name so the rest of
     * the browser session can still operate.
     */
    return sinkName;
  }
}

export async function destroySessionSink(
  sessionId: string,
): Promise<void> {
  const moduleId =
    moduleIdBySession.get(
      sessionId,
    );

  if (!moduleId) {
    return;
  }

  moduleIdBySession.delete(
    sessionId,
  );

  try {
    await pulseCommand([
      'unload-module',
      moduleId,
    ]);

    logger.info(
      'PulseAudio session sink removed',
      {
        sessionId,
        moduleId,
      },
    );
  } catch (err) {
    logger.error(
      'Failed to unload PulseAudio sink',
      {
        sessionId,
        moduleId,
        error: String(err),
      },
    );
  }
}

export function getSinkName(
  sessionId: string,
): string {
  return sinkNameFor(sessionId);
}

export function streamSessionAudio(
  sessionId: string,
  out: Writable,
): {
  stop: () => void;
} {
  const sink =
    sinkNameFor(sessionId);

  const monitor =
    `${sink}.monitor`;

  let stopped = false;

  /*
   * IMPORTANT:
   *
   * We intentionally do not use
   * ChildProcessWithoutNullStreams here.
   *
   * stdin is "ignore", therefore Node correctly
   * types stdin as null.
   */
  const ffmpeg = spawn(
    'ffmpeg',
    [
      '-hide_banner',

      /*
       * Warning level gives us useful errors
       * without flooding the Render logs.
       */
      '-loglevel',
      'warning',

      /*
       * PulseAudio input.
       */
      '-f',
      'pulse',

      '-i',
      monitor,

      /*
       * Audio format.
       */
      '-ac',
      '2',

      '-ar',
      '44100',

      /*
       * MP3 output.
       */
      '-c:a',
      'libmp3lame',

      '-b:a',
      '128k',

      /*
       * Stream MP3 through stdout.
       */
      '-f',
      'mp3',

      'pipe:1',
    ],
    {
      env: {
        ...pulseEnvironment(),

        /*
         * Explicit source selection.
         */
        PULSE_SOURCE:
          monitor,
      },

      /*
       * stdin is intentionally disabled.
       * stdout and stderr remain pipes.
       */
      stdio: [
        'ignore',
        'pipe',
        'pipe',
      ],
    },
  );

  /*
   * Send encoded audio to the caller.
   */
  ffmpeg.stdout.pipe(out);

  /*
   * Keep FFmpeg's stderr so that if it exits
   * unexpectedly we can see the real reason.
   */
  let stderrBuffer = '';

  ffmpeg.stderr.on(
    'data',
    (chunk: Buffer | string) => {
      const text =
        chunk.toString();

      stderrBuffer += text;

      /*
       * Avoid unlimited memory growth if
       * FFmpeg becomes noisy.
       */
      if (
        stderrBuffer.length > 8000
      ) {
        stderrBuffer =
          stderrBuffer.slice(-8000);
      }
    },
  );

  /*
   * Process-level spawn error.
   */
  ffmpeg.on(
    'error',
    (err) => {
      logger.error(
        'Failed to start ffmpeg for audio capture',
        {
          sessionId,
          sink,
          monitor,
          error: String(err),
        },
      );
    },
  );

  /*
   * Process exit.
   */
  ffmpeg.on(
    'exit',
    (code, signal) => {
      /*
       * Normal shutdown caused by stop().
       */
      if (stopped) {
        return;
      }

      /*
       * Unexpected shutdown.
       */
      if (
        code !== 0 &&
        code !== null
      ) {
        logger.warn(
          'ffmpeg audio capture exited unexpectedly',
          {
            sessionId,
            sink,
            monitor,
            code,
            signal,
            stderr:
              stderrBuffer.trim(),
          },
        );
      }
    },
  );

  /*
   * Return a safe shutdown function.
   */
  return {
    stop: () => {
      if (stopped) {
        return;
      }

      stopped = true;

      try {
        ffmpeg.stdout.unpipe(
          out,
        );
      } catch {
        /*
         * Ignore stream teardown errors.
         */
      }

      if (!ffmpeg.killed) {
        ffmpeg.kill('SIGTERM');
      }
    },
  };
}
