# Deployment notes

## TLS / reverse proxy

`docker-compose.yml` exposes plain HTTP (frontend on 8080, backend on 4000).
In production, put a TLS-terminating reverse proxy (nginx, Caddy, or a managed
load balancer) in front of the `frontend` service, obtain a certificate
(Let's Encrypt via Certbot or Caddy's automatic HTTPS), and redirect HTTP to
HTTPS. Set `TRUST_PROXY=true` and `NODE_ENV=production` in `.env` so:

- Express trusts `X-Forwarded-Proto` (needed for secure-cookie logic and the
  Security Center's HTTPS check to read correctly behind a proxy).
- Session cookies get the `Secure` flag.

## The Chromium sandbox trade-off

`PlaywrightContextEngine` launches Chromium with `--no-sandbox`. Running
Chromium as root disables its own sandbox unconditionally, and the backend
Dockerfile runs as the image's non-root `pwuser` specifically so the sandbox
*could* be re-enabled — but enabling it also typically requires a custom
seccomp profile (Playwright's docs publish one) allowing the `clone`/`unshare`
syscalls Chromium's namespace sandbox needs, which not every Docker host is
configured to allow by default. `--no-sandbox` is kept as the safe default so
the container runs unmodified on arbitrary hosts. If your host supports it:

1. Download Playwright's recommended seccomp profile.
2. Run the backend container with `--security-opt seccomp=/path/to/profile.json`.
3. Remove `--no-sandbox` from `PlaywrightContextEngine.ts`.

## Adding per-user container isolation

The default engine gives each session its own Chromium **process** and its
own on-disk **profile directory** — real isolation, but one layer short of
the original spec's "one Docker container per user" diagram. To add that
layer on top:

1. Build a small "browser worker" image: the same `mcr.microsoft.com/playwright`
   base, running a minimal internal server that hosts a `PlaywrightContextEngine`
   configured for exactly one session and exposes the same WebSocket protocol
   as `backend/src/ws/gateway.ts` — but with no auth, since it's only reachable
   from the orchestrator over a private Docker network, never from the internet.
2. Write an orchestrating `BrowserEngine` implementation that, instead of
   calling Playwright directly, uses `dockerode` to `createContainer` a fresh
   browser-worker container per session (with `Memory`/`NanoCpus` limits, no
   host mounts, and its own network), starts it, and transparently relays
   WebSocket frames between the real client and that container.
3. This requires giving the backend access to the Docker socket
   (`/var/run/docker.sock`), which is itself a meaningful privilege — treat it
   like root access to the host, run it in its own hardened service rather
   than alongside the rest of the API, and prefer a Docker-socket proxy that
   only allows the specific API calls (`create`, `start`, `stop`, `remove`)
   this needs rather than mounting the raw socket.

This wasn't shipped as a second implementation in this build because it can't
be exercised at all without a real Docker daemon (unavailable in the sandbox
this was built in) — better to give you a correct, well-scoped default plus
a clear extension path than a second, untested code path.

## Scaling beyond one backend instance

- **Sessions/WS**: `browser_sessions` truth lives in Postgres and the engine's
  in-memory map is per-process, so a session is only reachable from the
  backend instance that created it. Either run one backend replica, or add
  sticky routing (e.g. by user id) at the load balancer so a user's requests
  and WebSocket connections always land on the same instance.
- **Rate limiting**: `apiRateLimiter`/`loginRateLimiter` use `express-rate-limit`'s
  default in-memory store, which is per-instance. For multiple replicas, swap
  in a shared store (e.g. a Redis-backed one) so limits apply globally.
- **Idle sweep**: each instance runs its own sweep interval; harmless to run
  on multiple instances since the DB update is idempotent, but only the
  instance actually holding the Playwright process can really stop/destroy it
  — another reason sticky routing matters.

## Backups

- Postgres: standard `pg_dump`/WAL-archiving on the `postgres_data` volume.
- Files: back up the `files_storage` volume (or your S3 bucket, if
  `STORAGE_DRIVER=s3`) alongside the `files`/`folders` tables that reference it.
- Browser profiles (`browser_profiles` volume) are reproducible session state,
  not source-of-truth data — reasonable to exclude from backups.

## Security checklist before exposing this to the internet

This code was written with the following in mind, but has not been through an
automated scanner or independent review — treat this as a checklist to work
through, not a claim that it's done:

- [ ] Real TLS in front of everything; `TRUST_PROXY`/`NODE_ENV=production` set.
- [ ] `SESSION_SECRET`, `CSRF_SECRET`-equivalent, and `POSTGRES_PASSWORD`
      regenerated to long random values (not the `.env.example` placeholders).
- [ ] Dependency audit (`npm audit`, or a tool like `osv-scanner`) run against
      both `backend` and `frontend`.
- [ ] Confirm cross-user isolation manually: two accounts cannot see each
      other's tabs, history, files, or bookmarks (every query in `src/routes`
      filters by `req.auth.userId` — worth spot-checking directly).
- [ ] Confirm the WebSocket gateway rejects a connection with no session
      cookie, an expired session, or a session for a different device.
- [ ] Load-test the resource limits (`MAX_SESSIONS_PER_USER`, `MAX_TABS_PER_SESSION`,
      idle timeouts) against your actual server's CPU/RAM budget — one
      headless Chromium process is not free.
- [ ] Decide on the Chromium sandbox trade-off above rather than leaving the
      default silently in place.
- [ ] Penetration-test or at least manually attempt the OWASP-style checks
      listed in the original spec (XSS, CSRF, IDOR, path traversal, session
      fixation, auth bypass) rather than trusting that writing the code
      carefully was sufficient.
