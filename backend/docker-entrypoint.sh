#!/bin/sh

set -eu


# ============================================================
# CONFIGURATION
# ============================================================

export DISPLAY=:99

export XDG_RUNTIME_DIR=/tmp/runtime-pwuser

XVFB_DISPLAY=":99"
XVFB_SCREEN="1600x1000x24"

XVFB_PID=""

PULSEAUDIO_PID=""


# ============================================================
# BASIC DIRECTORY CHECKS
# ============================================================

echo "=========================================="
echo " ANURAG VIRTUAL COMPUTER"
echo " Container startup"
echo "=========================================="

echo "Checking X11 directory..."

if [ ! -d /tmp/.X11-unix ]; then
    echo "ERROR: /tmp/.X11-unix does not exist."
    echo "The Docker image was not built correctly."
    exit 1
fi

echo "X11 directory exists."

echo "Checking XDG runtime directory..."

mkdir -p "$XDG_RUNTIME_DIR"

chmod 700 "$XDG_RUNTIME_DIR"

echo "XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR"


# ============================================================
# CLEAN OLD X LOCK
# ============================================================
#
# Render normally starts a fresh container, but this prevents
# a stale lock from blocking Xvfb if the container runtime
# leaves one behind.
#
# We ONLY remove the lock when no X server is responding.
# ============================================================

if [ -f /tmp/.X99-lock ]; then

    echo "Found existing X99 lock."

    if xdpyinfo -display "$XVFB_DISPLAY" >/dev/null 2>&1; then

        echo "An X server is already running on $XVFB_DISPLAY."

    else

        echo "No active X server found."
        echo "Removing stale X99 lock."

        rm -f /tmp/.X99-lock

    fi
fi


# ============================================================
# START XVFB
# ============================================================

echo "Starting Xvfb on $XVFB_DISPLAY..."

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

    if kill -0 "$XVFB_PID" 2>/dev/null; then
        kill "$XVFB_PID" 2>/dev/null || true
    fi

    exit 1

fi


echo "Xvfb is ready."

echo "DISPLAY=$DISPLAY"


# ============================================================
# START PULSEAUDIO
# ============================================================

echo "Starting PulseAudio..."


# Remove stale PulseAudio PID/socket information if present.
# These are inside the per-user runtime directory, so this is
# safe for the pwuser container user.
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


# ============================================================
# PULSEAUDIO RESULT
# ============================================================

if [ "$PULSE_READY" -eq 1 ]; then

    echo "PulseAudio is ready."

    echo "Audio server:"
    pactl info 2>/dev/null | grep -E \
        'Server Name|Server String|Default Sink|Default Source' \
        || true

else

    echo "WARNING: PulseAudio could not be started."

    echo "The virtual computer will continue without audio."

fi


# ============================================================
# FINAL ENVIRONMENT CHECK
# ============================================================

echo "=========================================="
echo " Runtime environment"
echo "=========================================="

echo "User:"
whoami || true

echo "DISPLAY:"
echo "$DISPLAY"

echo "XDG_RUNTIME_DIR:"
echo "$XDG_RUNTIME_DIR"

echo "X11:"
if xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
    echo "READY"
else
    echo "NOT READY"
fi

echo "PulseAudio:"
if pactl info >/dev/null 2>&1; then
    echo "READY"
else
    echo "UNAVAILABLE"
fi

echo "=========================================="
echo " Starting ANURAG VIRTUAL COMPUTER backend"
echo "=========================================="


# ============================================================
# START NODE BACKEND
# ============================================================

exec "$@"
