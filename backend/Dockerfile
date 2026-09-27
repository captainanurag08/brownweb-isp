# Keep this tag's major.minor in sync with the "playwright" version in
# package.json - a mismatch between the npm package and the browsers baked
# into this image is the most common source of "browser not found" errors.
ARG PLAYWRIGHT_VERSION=v1.63.0

FROM mcr.microsoft.com/playwright:${PLAYWRIGHT_VERSION}-noble AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM mcr.microsoft.com/playwright:${PLAYWRIGHT_VERSION}-noble
ENV NODE_ENV=production
WORKDIR /app

# Audio support: headless Chromium does not reliably produce capturable audio,
# so we run headful inside a virtual display (Xvfb) and route Chromium's audio
# into a per-session PulseAudio null sink that ffmpeg then captures on demand.
# This is the single least-tested part of this project - see
# docs/DEPLOYMENT.md and audioCapture.ts before relying on it in production.
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb pulseaudio pulseaudio-utils ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY db ./db
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# The image ships a non-root user ("pwuser"). Running as non-root disables
# root's implicit --no-sandbox requirement, but this Dockerfile still passes
# --no-sandbox explicitly (see PlaywrightContextEngine.ts) for compatibility
# across arbitrary Docker hosts. If your host supports the seccomp profile
# Playwright documents for the Chromium sandbox, you can remove --no-sandbox
# for stronger isolation - see docs/DEPLOYMENT.md.
ENV HOME=/home/pwuser
RUN mkdir -p /data/profiles /data/files /tmp/avc-private /home/pwuser && \
    chown -R pwuser:pwuser /app /data /tmp/avc-private /home/pwuser

USER pwuser
EXPOSE 4000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
