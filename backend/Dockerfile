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
        dbus-x11 \
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

RUN chmod 755 /usr/local/bin/docker-entrypoint.sh


# ============================================================
# APPLICATION DIRECTORIES
# ============================================================

RUN mkdir -p \
        /data/profiles \
        /data/files \
        /tmp/avc-private \
        /tmp/runtime-pwuser \
        /home/pwuser \
        /tmp/.X11-unix && \
    chown -R pwuser:pwuser \
        /app \
        /data \
        /tmp/avc-private \
        /tmp/runtime-pwuser \
        /home/pwuser && \
    chown root:root /tmp/.X11-unix && \
    chmod 1777 /tmp/.X11-unix && \
    chmod 700 /tmp/runtime-pwuser


# ============================================================
# IMPORTANT
# ============================================================
#
# Keep the container entrypoint running as root.
#
# It creates /tmp/.X11-unix at runtime, then starts the
# browser environment under pwuser.
#
# The Node process itself will run as pwuser.
# ============================================================

EXPOSE 4000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

CMD ["node", "dist/index.js"]
