#!/bin/sh

set -eu


# ============================================================
# ANURAG VIRTUAL COMPUTER
# CONTAINER ENTRYPOINT
# ============================================================

echo ""
echo "=========================================="
echo " ANURAG VIRTUAL COMPUTER"
echo " Container startup"
echo "=========================================="
echo ""


# ============================================================
# CONFIGURATION
# ============================================================

export DISPLAY=:99

export XDG_RUNTIME_DIR=/tmp/runtime-pwuser

XVFB_DISPLAY=":99"
XVFB_SCREEN="1600x1000x24"

APP_USER="pwuser"
APP_GROUP="pwuser"


# ============================================================
# CHECK CURRENT USER
# ============================================================

echo "Container user:"
whoami

echo ""


# ============================================================
# CREATE X11 SOCKET DIRECTORY
# ============================================================
#
# THIS MUST HAPPEN AT RUNTIME.
#
# Docker image creation happens earlier, but /tmp may be reset
# when the container actually starts.
#
# Xvfb requires:
#
#   /tmp/.X11-unix
#
# owned by root with mode 1777.
# ============================================================

echo "Preparing X11 runtime directory..."

mkdir -p /tmp/.X11-unix

chown root:root /tmp/.X11-unix

chmod 1777 /tmp/.X11-unix

echo "X11 directory:"
ls -ld /tmp/.X11-unix

echo ""


# ============================================================
# PREPARE APPLICATION RUNTIME DIRECTORIES
# ============================================================

echo "Preparing application runtime directories..."

mkdir -p \
    /tmp/runtime-pwuser \
    /tmp/avc-private \
    /data/profiles \
    /data/files \
    /home/pwuser

chown "$APP_USER:$APP_GROUP" \
    /tmp/runtime-pwuser \
    /tmp/avc-private \
    /data/profiles \
    /data/files \
    /home/pwuser

chmod 700 /tmp/runtime-pwuser

echo "Runtime directories ready."

echo ""


# ============================================================
# PREPARE PULSEAUDIO DIRECTORY
# ============================================================

mkdir -p /tmp/runtime-pwuser/pulse

chown -R "$APP_USER:$APP_GROUP" /tmp/runtime-pwuser

chmod 700 /tmp/runtime-pwuser

echo "PulseAudio runtime directory ready."

echo ""


# ============================================================
# DROP PRIVILEGES
# ============================================================
#
# Everything below this point runs as pwuser.
#
# We deliberately do NOT run the browser/backend as root.
# ============================================================

echo "Switching from root to $APP_USER..."

exec su \
    -s /bin/sh \
    "$APP_USER" \
    -c '
        set -eu

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

        echo "Running as:"
        whoami

        echo ""

        echo "DISPLAY=$DISPLAY"
        echo "XDG_RUNTIME_DIR=$XDG_RUNTIME_DIR"

        echo ""


        # ====================================================
        # CLEAN STALE X LOCK
        # ====================================================

        if [ -f /tmp/.X99-lock ]; then

            echo "Found /tmp/.X99-lock"

            if xdpyinfo -display "$XVFB_DISPLAY" >/dev/null 2>&1; then

                echo "An X server is already running."

            else

                echo "Removing stale Xvfb lock."

                rm -f /tmp/.X99-lock

            fi

        fi


        # ====================================================
        # START XVFB
        # ====================================================

        echo "Starting Xvfb..."

        Xvfb "$XVFB_DISPLAY" \
            -screen 0 "$XVFB_SCREEN" \
            -nolisten tcp \
            -ac \
            +extension GLX \
            +extension RANDR \
            +extension RENDER &

        XVFB_PID=$!


        # ====================================================
        # WAIT FOR XVFB
        # ====================================================

        echo "Waiting for Xvfb..."

        XVFB_READY=0

        i=0

        while [ "$i" -lt 30 ]; do

            if xdpyinfo -display "$XVFB_DISPLAY" >/dev/null 2>&1; then

                XVFB_READY=1
                break

            fi

            if ! kill -0 "$XVFB_PID" 2>/dev/null; then

                echo ""
                echo "ERROR: Xvfb exited unexpectedly."

                wait "$XVFB_PID" 2>/dev/null || true

                exit 1

            fi

            i=$((i + 1))

            sleep 1

        done


        if [ "$XVFB_READY" -ne 1 ]; then

            echo ""
            echo "ERROR: Timed out waiting for Xvfb."

            if kill -0 "$XVFB_PID" 2>/dev/null; then
                kill "$XVFB_PID" 2>/dev/null || true
            fi

            exit 1

        fi


        echo "Xvfb is READY."

        echo "DISPLAY=$DISPLAY"

        echo ""


        # ====================================================
        # START PULSEAUDIO
        # ====================================================

        echo "Starting PulseAudio..."


        # Remove stale user PulseAudio files.

        rm -f \
            "$XDG_RUNTIME_DIR/pulse/pid" \
            "$XDG_RUNTIME_DIR/pulse/native" \
            2>/dev/null || true


        pulseaudio \
            --exit-idle-time=-1 \
            --daemonize=no \
            --log-target=stderr &

        PULSEAUDIO_PID=$!


        # ====================================================
        # WAIT FOR PULSEAUDIO
        # ====================================================

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


        # ====================================================
        # PULSEAUDIO STATUS
        # ====================================================

        if [ "$PULSE_READY" -eq 1 ]; then

            echo "PulseAudio is READY."

            pactl info 2>/dev/null | \
                grep -E \
                "Server Name|Server String|Default Sink|Default Source" \
                || true

        else

            echo "WARNING: PulseAudio is unavailable."

            echo "The virtual computer will continue without audio."

        fi


        echo ""


        # ====================================================
        # FINAL CHECK
        # ====================================================

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

        echo "=========================================="
        echo " Starting backend"
        echo "=========================================="

        echo ""


        # ====================================================
        # START NODE BACKEND
        # ====================================================

        exec "$@"
    ' -- "$@"
    
