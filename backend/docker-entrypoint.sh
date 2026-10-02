#!/bin/sh
set -eu

export DISPLAY="${DISPLAY:-:99}"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/tmp/runtime-pwuser}"

mkdir -p "$XDG_RUNTIME_DIR"
chmod 700 "$XDG_RUNTIME_DIR"

# Xvfb requires /tmp/.X11-unix to exist and be writable/usable
# by the X server. The Docker image runs as pwuser, so create
# the directory explicitly before starting Xvfb.
X11_SOCKET_DIR="/tmp/.X11-unix"

if [ ! -d "$X11_SOCKET_DIR" ]; then
    mkdir -p "$X11_SOCKET_DIR"
fi

chmod 1777 "$X11_SOCKET_DIR"

# Remove only a stale lock. Never kill an existing X server.
if [ -f "/tmp/.X99-lock" ]; then
    if ! xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
        rm -f "/tmp/.X99-lock"
    fi
fi

start_xvfb() {
    if xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
        echo "Xvfb already running on $DISPLAY"
        return 0
    fi

    echo "Starting Xvfb on $DISPLAY"

    Xvfb "$DISPLAY" \
        -screen 0 1600x1000x24 \
        -nolisten tcp \
        -ac \
        >/tmp/xvfb.log 2>&1 &

    XVFB_PID=$!

    i=0

    while ! xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; do
        i=$((i + 1))

        if ! kill -0 "$XVFB_PID" 2>/dev/null; then
            echo "Xvfb exited unexpectedly."
            echo "----- Xvfb log -----"
            cat /tmp/xvfb.log || true
            echo "--------------------"
            exit 1
        fi

        if [ "$i" -ge 100 ]; then
            echo "Timed out waiting for Xvfb."
            echo "----- Xvfb log -----"
            cat /tmp/xvfb.log || true
            echo "--------------------"
            exit 1
        fi

        sleep 0.1
    done

    echo "Xvfb ready on $DISPLAY"
}

start_pulseaudio() {
    if pactl info >/dev/null 2>&1; then
        echo "PulseAudio already running"
        return 0
    fi

    echo "Starting PulseAudio"

    pulseaudio \
        --daemonize=yes \
        --exit-idle-time=-1 \
        --log-target=stderr \
        >/tmp/pulseaudio.log 2>&1 || true

    i=0

    while ! pactl info >/dev/null 2>&1; do
        i=$((i + 1))

        if [ "$i" -ge 100 ]; then
            echo "PulseAudio did not become ready."
            echo "----- PulseAudio log -----"
            cat /tmp/pulseaudio.log || true
            echo "--------------------------"

            # Do not kill the whole virtual computer just because
            # audio is unavailable.
            return 0
        fi

        sleep 0.1
    done

    echo "PulseAudio ready"
}

start_xvfb
start_pulseaudio

echo "Virtual display: $DISPLAY"
echo "Runtime directory: $XDG_RUNTIME_DIR"

exec "$@"
