#!/bin/sh
set -eu

export DISPLAY="${DISPLAY:-:99}"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp/runtime-pwuser}"

mkdir -p "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"

start_xvfb() {
    if xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
        echo "Xvfb already running on $DISPLAY"
        return
    fi

    rm -f "/tmp/.X${DISPLAY#:}-lock" 2>/dev/null || true

    Xvfb "$DISPLAY" \
        -screen 0 1600x1000x24 \
        -nolisten tcp \
        >/tmp/xvfb.log 2>&1 &

    xvfb_pid=$!

    i=0
    while ! xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; do
        i=$((i + 1))

        if ! kill -0 "$xvfb_pid" 2>/dev/null; then
            echo "Xvfb failed to start:"
            cat /tmp/xvfb.log || true
            exit 1
        fi

        if [ "$i" -ge 50 ]; then
            echo "Timed out waiting for Xvfb"
            cat /tmp/xvfb.log || true
            exit 1
        fi

        sleep 0.1
    done
}

start_pulseaudio() {
    if pactl info >/dev/null 2>&1; then
        echo "PulseAudio already running"
        return
    fi

    pulseaudio \
        --daemonize=no \
        --exit-idle-time=-1 \
        --log-target=stderr \
        >/tmp/pulseaudio.log 2>&1 &

    pulse_pid=$!

    i=0
    while ! pactl info >/dev/null 2>&1; do
        i=$((i + 1))

        if ! kill -0 "$pulse_pid" 2>/dev/null; then
            echo "PulseAudio failed to start:"
            cat /tmp/pulseaudio.log || true
            exit 1
        fi

        if [ "$i" -ge 50 ]; then
            echo "Timed out waiting for PulseAudio"
            cat /tmp/pulseaudio.log || true
            exit 1
        fi

        sleep 0.1
    done
}

start_xvfb
start_pulseaudio

echo "Virtual display ready: $DISPLAY"
echo "PulseAudio ready"

exec "$@"
