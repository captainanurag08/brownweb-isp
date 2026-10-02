# ============================================================
# ANURAG VIRTUAL COMPUTER
# Backend Dockerfile
# ============================================================

ARG PLAYWRIGHT_VERSION=v1.63.0


# ============================================================
# BUILD STAGE
# ============================================================

FROM mcr.microsoft.com/playwright:${PLAYWRIGHT_VERSION}-noble AS build

WORKDIR /app

COPY package*.json ./

RUN npm install --package-lock=false

COPY tsconfig.json ./
COPY src ./src

RUN npm run build


# ============================================================
# RUNTIME STAGE
# ============================================================

FROM mcr.microsoft.com/playwright:${PLAYWRIGHT_VERSION}-noble

ENV NODE_ENV=production
ENV HOME=/home/pwuser

WORKDIR /app


# ============================================================
# SYSTEM PACKAGES
# ============================================================

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        xvfb \
        pulseaudio \
        pulseaudio-utils \
        ffmpeg \
        x11-utils \
    && rm -rf /var/lib/apt/lists/*


# ============================================================
# PRODUCTION DEPENDENCIES
# ============================================================

COPY package*.json ./

RUN npm install --omit=dev --package-lock=false


# ============================================================
# APPLICATION
# ============================================================

COPY --from=build /app/dist ./dist

COPY db ./db

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh


# ============================================================
# APPLICATION DIRECTORIES
# ============================================================

RUN mkdir -p \
        /data/profiles \
        /data/files \
        /tmp/avc-private \
        /tmp/runtime-pwuser \
        /home/pwuser && \
    chown -R pwuser:pwuser \
        /app \
        /data \
        /tmp/avc-private \
        /tmp/runtime-pwuser \
        /home/pwuser && \
    chmod 700 /tmp/runtime-pwuser


# ============================================================
# IMPORTANT
# ============================================================
#
# DO NOT use:
#
# USER pwuser
#
# here.
#
# The entrypoint needs temporary root privileges at container
# startup to recreate /tmp/.X11-unix because /tmp can be reset
# when the container starts.
#
# The entrypoint creates the X11 directory as:
#
#     root:root
#     chmod 1777
#
# and then drops to pwuser before starting Xvfb, PulseAudio
# and Node.
# ============================================================


EXPOSE 4000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

CMD ["node", "dist/index.js"]
