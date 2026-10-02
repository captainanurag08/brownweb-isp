# Keep this version synchronized with the Playwright npm package.
ARG PLAYWRIGHT_VERSION=v1.63.0

# ============================================================
# BUILD STAGE
# ============================================================
FROM mcr.microsoft.com/playwright:${PLAYWRIGHT_VERSION}-noble AS build

WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm install --package-lock=false

# Copy TypeScript configuration and source
COPY tsconfig.json ./
COPY src ./src

# Compile TypeScript
RUN npm run build


# ============================================================
# RUNTIME STAGE
# ============================================================
FROM mcr.microsoft.com/playwright:${PLAYWRIGHT_VERSION}-noble

ENV NODE_ENV=production
ENV HOME=/home/pwuser

WORKDIR /app

# ------------------------------------------------------------
# System packages
# ------------------------------------------------------------
# Xvfb:
#   Virtual X display for headful Chromium
#
# PulseAudio:
#   Virtual audio server
#
# ffmpeg:
#   Audio capture/processing
#
# pulseaudio-utils:
#   pactl and related PulseAudio utilities
#
# x11-utils:
#   xdpyinfo, used to verify Xvfb is actually ready
# ------------------------------------------------------------
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        xvfb \
        pulseaudio \
        pulseaudio-utils \
        ffmpeg \
        x11-utils \
    && rm -rf /var/lib/apt/lists/*


# ------------------------------------------------------------
# Production npm dependencies
# ------------------------------------------------------------
COPY package*.json ./

RUN npm install --omit=dev --package-lock=false


# ------------------------------------------------------------
# Application files
# ------------------------------------------------------------
COPY --from=build /app/dist ./dist
COPY db ./db

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh


# ------------------------------------------------------------
# Runtime directories
# ------------------------------------------------------------
#
# IMPORTANT:
#
# /tmp/.X11-unix MUST:
#   - exist before switching to pwuser
#   - remain owned by root
#   - have mode 1777
#
# Xvfb checks this directory when starting.
#
# Do NOT chown this directory to pwuser.
# ------------------------------------------------------------
RUN mkdir -p \
        /data/profiles \
        /data/files \
        /tmp/avc-private \
        /tmp/runtime-pwuser \
        /tmp/.X11-unix \
        /home/pwuser && \
    chown root:root /tmp/.X11-unix && \
    chmod 1777 /tmp/.X11-unix && \
    chmod 700 /tmp/runtime-pwuser && \
    chown -R pwuser:pwuser \
        /app \
        /data \
        /tmp/avc-private \
        /tmp/runtime-pwuser \
        /home/pwuser


# ------------------------------------------------------------
# Run Chromium/backend as non-root
# ------------------------------------------------------------
USER pwuser

EXPOSE 4000

ENTRYPOINT ["docker-entrypoint.sh"]

CMD ["node", "dist/index.js"]
