#!/bin/sh
set -e

# Virtual display - headful Chromium needs somewhere to render even though
# nothing is ever actually shown on screen. This is the standard pattern for
# running headful browsers in a container (the same one browser-test CI
# runners and screen-recording sidecars use).
export DISPLAY=:99
Xvfb :99 -screen 0 1600x1000x24 -nolisten tcp &

# PulseAudio, with no real hardware sink - only the per-session null sinks
# created in audioCapture.ts as sessions start. --exit-idle-time=-1 keeps it
# running with zero sinks loaded (its default idle-shutdown would otherwise
# kill it before the first session exists).
export XDG_RUNTIME_DIR=/tmp/runtime-pwuser
mkdir -p "$XDG_RUNTIME_DIR"
pulseaudio --exit-idle-time=-1 --log-target=stderr &

# Give both a moment to come up before Chromium/Node start expecting them.
sleep 1

exec "$@"
