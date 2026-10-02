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
# VERIFY ROOT
# ============================================================

CURRENT_USER="$(id -un)"

echo "Initial container user: $CURRENT_USER"

if [ "$(id -u)" != "0" ]; then
    echo "ERROR: docker-entrypoint.sh must start as root."
    exit 1
fi

echo ""


# ============================================================
# PREPARE X11
# ============================================================

echo "Preparing X11 runtime directory..."

mkdir -p /tmp/.X11-unix

chown root:root /tmp/.X11-unix

chmod 1777 /tmp/.X11-unix

echo "X11 directory:"
ls -ld /tmp/.X11-unix

echo ""


# ============================================================
# PREPARE APPLICATION DIRECTORIES
# ============================================================

echo "Preparing application directories..."

mkdir -p \
    /tmp/runtime-pwuser \
    /tmp/avc-private \
    /data/profiles \
    /data/files \
    /home/pwuser

chown -R "$APP_USER:$APP_GROUP" \
    /tmp/runtime-pwuser \
    /tmp/avc-private \
    /data/profiles \
    /data/files \
    /home/pwuser

chmod 700 /tmp/runtime-pwuser

echo "Application directories ready."

echo ""


# ============================================================
# PULSEAUDIO RUNTIME DIRECTORY
# ============================================================

mkdir -p /tmp/runtime-pwuser/pulse

chown -R "$APP_USER:$APP_GROUP" /tmp/runtime-pwuser

chmod 700 /tmp/runtime-pwuser

echo "PulseAudio runtime directory ready."

echo ""


# ============================================================
# REMOVE STALE X LOCK
# ============================================================

if [ -f /tmp/.X99-lock ]; then

    echo "Found stale Xvfb lock."

    rm -f /tmp/.X99-lock

fi


# ============================================================
# START EVERYTHING AS PWUSER
# ============================================================
#
# We use runuser rather than passing the Docker CMD through
# su -c.
#
# This avoids the previous:
#
#     exec: dist/index.js: Permission denied
#
# problem.
# ============================================================

echo "Starting virtual computer as $APP_USER..."

exec runuser \
    -u "$APP_USER" \
    -- /usr/local/bin/avc-runtime.sh
