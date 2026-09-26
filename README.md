# ANURAG VIRTUAL COMPUTER

A private virtual computer you operate from a normal browser. Your device is the
display and input; a real Chromium instance runs on the server and does the
actual browsing.

```
USER DEVICE → HTTPS/WSS → ANURAG VIRTUAL COMPUTER → SESSION MANAGER → CHROMIUM (Playwright) → Internet
```

This is a real, working implementation end to end — not a mockup. It has not
been run in a live environment (see **Known limitations** below): it was built
in a sandbox with no network or Docker access, so `npm install`, pulling the
Playwright/Chromium image, and `docker compose up` all need to happen on your
machine for the first time. Expect a first real run-and-fix pass.

## How the browsing actually works

- Each session gets its own Chromium **process** via Playwright's
  `launchPersistentContext`, pointed at a per-session profile directory. That's
  Chromium's own native profile mechanism — real, on-disk isolation of cookies,
  cache, localStorage, IndexedDB, and login state, the same guarantee a real
  desktop profile gives you.
- The remote page is streamed to your browser as JPEG frames over WebSocket
  using the Chrome DevTools Protocol's `Page.startScreencast` (push-based,
  only sends frames on change — not polling screenshots).
- Mouse, wheel, keyboard, and touch input are forwarded over the same
  WebSocket to Playwright's input APIs (`page.mouse`, `page.keyboard`,
  `page.touchscreen`).
- The `BrowserEngine` interface (`backend/src/browser/BrowserEngine.ts`)
  abstracts all of this, so the streaming/control mechanism can be swapped
  later (e.g. for WebRTC) without touching the rest of the app.

## What's implemented

- Auth: register/login/logout, bcrypt hashing, durable account lockout after
  repeated failures, CSRF (double-submit cookie), Redis-backed sessions,
  secure cookies in production, per-IP and per-account rate limiting.
- Virtual device + first-run flow.
- Real remote browser sessions: tabs (new/close/switch/navigate/back/forward/
  reload), enforced tab limits, viewport resize.
- History (recorded server-side, searchable, deletable per-item/today/all),
  bookmarks, a small Notes app, a file manager with pluggable local-disk or
  S3-compatible storage and a real per-user storage quota.
- Downloads initiated inside the remote browser are captured and land in the
  file manager automatically.
- Settings: device/browser/appearance/privacy sections, persistent vs. private
  session mode, device PIN + auto-lock.
- Security Center with **computed, not hardcoded** status (HTTPS, cookie
  security, isolation mode, etc.), an active-login-sessions list backed by
  Redis, and per-session revocation ("log out this device").
- A visible, confirmed "Destroy virtual browser" flow that actually deletes
  the Chromium profile directory on disk.
- Idle-timeout sweeping (stops persistent sessions, fully destroys private
  ones) and best-effort crash recovery if a Chromium process dies unexpectedly.
- Full Postgres schema + migrations, Docker Compose for the whole stack, and a
  starter test suite (`backend/tests`) for the parts that don't need a live
  database (password hashing, lockout logic, history grouping/search, and one
  SessionManager test against a mocked DB/engine).

## Known limitations / roadmap

- **Not run yet.** No network or Docker in the build sandbox means none of
  this was executed end to end. I type-checked the backend against the real
  Playwright types and reviewed every file by hand, but you should expect a
  first real debugging pass — happy to help once you have real error output.
- **Isolation model.** The default is one Chromium *process* per session with
  its own profile directory, not one Docker *container* per user. This still
  gives real isolation (separate processes, separate on-disk profiles), but
  it's one layer short of the spec's container-per-user diagram. See
  `docs/DEPLOYMENT.md` for how to add that layer.
- **No email service**, so "Forgot password" is a visible stub, not wired up.
- **No WebRTC.** Screencast-over-WebSocket is what the original spec allows as
  a first implementation; the `BrowserEngine` abstraction is what would let
  you swap it in later.
- Not implemented: tab drag-to-reorder, tab duplication, pinch-zoom, clipboard
  sync between your device and the remote browser, device backup/export, and
  full IME composition support (basic typing/paste works; see the comment in
  `BrowserView.tsx`).
- Security testing (section 56 of the spec — XSS/CSRF/IDOR/etc. sweeps) has
  not been performed by an automated tool or a human reviewer other than me
  writing the code with these in mind. Treat this as a strong starting point,
  not a security-audited artifact — see the checklist in
  `docs/DEPLOYMENT.md` before exposing it to the internet.

## Getting started

```bash
cp .env.example .env
# edit .env - at minimum SESSION_SECRET, CSRF_SECRET, POSTGRES_PASSWORD
docker compose up --build
```

- Frontend: http://localhost:8080
- Backend API directly: http://localhost:4000/api/health

The `playwright` npm version (`backend/package.json`) and the Docker image tag
(`backend/Dockerfile`, `ARG PLAYWRIGHT_VERSION`) must stay on the same
major.minor — a mismatch is the most common source of "browser not found"
errors with Playwright in Docker.

### Local development (faster iteration than full Docker)

```bash
docker compose up postgres redis   # just the infra
cd backend && npm install && npm run migrate:dev && npm run dev
cd frontend && npm install && npm run dev
```

### Tests

```bash
cd backend && npm install && npm test
```

## Project layout

```
backend/
  src/
    auth/        register, login, sessions, CSRF, lockout
    browser/     BrowserEngine interface + Playwright implementation, SessionManager
    ws/          WebSocket gateway (input in, frames/events out)
    routes/      REST API (device, tabs, history, bookmarks, files, settings, security, notes)
    storage/     pluggable local-disk / S3 object storage
    middleware/  error handling, validation, rate limiting
  db/migrations/ SQL schema, applied in order by src/db/migrate.ts
  tests/         vitest unit tests
frontend/
  src/
    components/  Shell (device UI), Browser, Files, History, Bookmarks, Notes, Settings
    services/    REST client, WebSocket client
    state/       zustand store
docs/DEPLOYMENT.md   TLS, scaling, container-isolation extension, security checklist
```

## Privacy, honestly

ANURAG VIRTUAL COMPUTER keeps its own history, bookmarks, and profile data,
separate from your physical device. It does **not** make you anonymous:
websites you visit still see the connection, IP address, and normal browser
signals of the *remote* Chromium instance, and can still log and track
activity on their own servers exactly as they would for any other visitor.
Clearing history here clears what this app keeps — it has no effect on what
Google, YouTube, or any other site records independently.
