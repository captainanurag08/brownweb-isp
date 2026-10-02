#!/bin/sh

set -eu


# ============================================================
# ANURAG VIRTUAL COMPUTER
# USER RUNTIME
# ============================================================

export DISPLAY=:99
export XDG_RUNTIME_DIR=/tmp/runtime-pwuser

XVFB_DISPLAY=":99"
XVFB_SCREEN="1600x1000x24"


echo ""
echo "=========================================="
echo " ANURAG VIRTUAL COMPUTER"
echo " User runtime"
echo "=========================================="
echo ""

echo "User:"
whoami

echo ""

echo "DISPLAY=$DISPLAY"
echo "XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR"

echo ""


# ============================================================
# START XVFB
# ============================================================

echo "Starting Xvfb..."

Xvfb "$XVFB_DISPLAY" \
    -screen 0 "$XVFB_SCREEN" \
    -nolisten tcp \
    -ac \
    +extension GLX \
    +extension RANDR \
    +extension RENDER &

XVFB_PID=$!


# ============================================================
# WAIT FOR XVFB
# ============================================================

echo "Waiting for Xvfb..."

XVFB_READY=0

i=0

while [ "$i" -lt 30 ]; do

    if xdpyinfo -display "$XVFB_DISPLAY" >/dev/null 2>&1; then

        XVFB_READY=1
        break

    fi

    if ! kill -0 "$XVFB_PID" 2>/dev/null; then

        echo "ERROR: Xvfb exited unexpectedly."

        wait "$XVFB_PID" 2>/dev/null || true

        exit 1

    fi

    i=$((i + 1))

    sleep 1

done


if [ "$XVFB_READY" -ne 1 ]; then

    echo "ERROR: Timed out waiting for Xvfb."

    exit 1

fi


echo "Xvfb is READY."

echo ""


# ============================================================
# START PULSEAUDIO
# ============================================================

echo "Starting PulseAudio..."

rm -f \
    "$XDG_RUNTIME_DIR/pulse/pid" \
    "$XDG_RUNTIME_DIR/pulse/native" \
    2>/dev/null || true


pulseaudio \
    --exit-idle-time=-1 \
    --daemonize=no \
    --log-target=stderr &

PULSEAUDIO_PID=$!


# ============================================================
# WAIT FOR PULSEAUDIO
# ============================================================

echo "Waiting for PulseAudio..."

PULSE_READY=0

i=0

while [ "$i" -lt 30 ]; do

    if pactl info >/dev/null 2>&1; then

        PULSE_READY=1
        break

    fi

    if ! kill -0 "$PULSEAUDIO_PID" 2>/dev/null; then

        echo "WARNING: PulseAudio exited."

        break

    fi

    i=$((i + 1))

    sleep 1

done


if [ "$PULSE_READY" -eq 1 ]; then

    echo "PulseAudio is READY."

    echo ""

    pactl info 2>/dev/null | \
        grep -E \
        "Server Name|Server String|Default Sink|Default Source" \
        || true

else

    echo "WARNING: PulseAudio unavailable."

fi


echo ""


# ============================================================
# FINAL ENVIRONMENT CHECK
# ============================================================

echo "=========================================="
echo " Runtime checks"
echo "=========================================="

echo "User:"
whoami

echo ""

echo "Display:"

if xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
    echo "READY"
else
    echo "FAILED"
    exit 1
fi

echo ""

echo "PulseAudio:"

if pactl info >/dev/null 2>&1; then
    echo "READY"
else
    echo "UNAVAILABLE"
fi

echo ""

echo "Node:"
node --version

echo ""

echo "Application:"
if [ -f /app/dist/index.js ]; then
    echo "dist/index.js FOUND"
else
    echo "ERROR: dist/index.js NOT FOUND"
    exit 1
fi

echo ""

echo "Application permissions:"
ls -l /app/dist/index.js

echo ""


# ============================================================
# START NODE
# ============================================================

echo "=========================================="
echo " Starting backend"
echo "=========================================="

echo ""

exec node /app/dist/index.js
