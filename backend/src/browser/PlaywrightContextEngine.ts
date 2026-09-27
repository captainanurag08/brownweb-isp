import crypto from 'crypto';
import fs from 'fs/promises';
import { chromium, type BrowserContext, type Page, type CDPSession } from 'playwright';
import { BrowserEngine, type TabInfo } from './BrowserEngine';
import { createSessionSink, destroySessionSink } from './audioCapture';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface TabState {
  page: Page;
  cdp: CDPSession | null;
  info: TabInfo;
  screencastActive: boolean;
}

interface SessionState {
  context: BrowserContext;
  mode: 'persistent' | 'private';
  profileDir: string;
  tabs: Map<string, TabState>;
  activeTabId: string | null;
  intentionalClose: boolean;
  viewport: { width: number; height: number };
}

/**
 * Each session gets its own Chromium process via `launchPersistentContext`,
 * which is Chromium's own native user-data-directory profile mechanism. That
 * gives real, on-disk isolation of cookies, cache, localStorage, IndexedDB,
 * and service workers per session/device — the same guarantee a real desktop
 * profile gives you — without needing a second OS-level container per user.
 * See docs/DEPLOYMENT.md for how to add per-user container isolation on top
 * of this for defense in depth.
 */
export class PlaywrightContextEngine extends BrowserEngine {
  private sessions = new Map<string, SessionState>();

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  private require(sessionId: string): SessionState {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`No active browser session ${sessionId}`);
    return session;
  }

  private requireTab(sessionId: string, tabId: string): { session: SessionState; tab: TabState } {
    const session = this.require(sessionId);
    const tab = session.tabs.get(tabId);
    if (!tab) throw new Error(`No tab ${tabId} in session ${sessionId}`);
    return { session, tab };
  }

  async createSession(sessionId: string, opts: { mode: 'persistent' | 'private'; profileDir: string }): Promise<void> {
    await fs.mkdir(opts.profileDir, { recursive: true });

    const sinkName = env.audioEnabled ? await createSessionSink(sessionId) : null;

    const context = await chromium.launchPersistentContext(opts.profileDir, {
      headless: env.browserHeadless,
      viewport: { width: env.screencastMaxWidth, height: env.screencastMaxHeight },
      hasTouch: true,
      isMobile: false,
      acceptDownloads: true,
      ignoreHTTPSErrors: false,
      env: sinkName ? { ...process.env, PULSE_SINK: sinkName } : undefined,
      args: [
        '--no-sandbox', // see docs/DEPLOYMENT.md: trade-off documented there
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--autoplay-policy=no-user-gesture-required',
      ],
    });

    const state: SessionState = {
      context,
      mode: opts.mode,
      profileDir: opts.profileDir,
      tabs: new Map(),
      activeTabId: null,
      intentionalClose: false,
      viewport: { width: env.screencastMaxWidth, height: env.screencastMaxHeight },
    };
    this.sessions.set(sessionId, state);

    // Pages opened by the page itself (target="_blank", window.open, OAuth
    // popups such as Google sign-in) must also become tracked tabs.
    context.on('page', (page) => {
      if ([...state.tabs.values()].some((t) => t.page === page)) return;
      this.registerTab(sessionId, page).catch((err) =>
        logger.warn('Failed to register externally-opened tab', { sessionId, error: String(err) })
      );
    });

    context.on('close', () => {
      const wasIntentional = state.intentionalClose;
      this.sessions.delete(sessionId);
      if (!wasIntentional) {
        logger.warn('Browser context closed unexpectedly', { sessionId, mode: state.mode });
        this.emit('crashed', sessionId);
      }
    });
  }

  private async registerTab(sessionId: string, page: Page, url?: string): Promise<TabInfo> {
    const session = this.require(sessionId);
    const tabId = crypto.randomUUID();

    const info: TabInfo = {
      id: tabId,
      url: page.url() || url || 'about:blank',
      title: 'New Tab',
      favicon: null,
      isActive: session.tabs.size === 0,
      position: session.tabs.size,
    };

    const tabState: TabState = { page, cdp: null, info, screencastActive: false };
    session.tabs.set(tabId, tabState);
    if (info.isActive) {
      session.activeTabId = tabId;
    }

    page.on('load', () => {
      page
        .title()
        .then((title) => {
          tabState.info.title = title || tabState.info.url;
          this.emit('tabUpdated', sessionId, { ...tabState.info });
        })
        .catch(() => undefined);
    });

    page.on('framenavigated', (frame) => {
      if (frame !== page.mainFrame()) return;
      const navUrl = page.url();
      tabState.info.url = navUrl;
      this.emit('navigation', sessionId, tabId, navUrl, tabState.info.title);
      this.emit('tabUpdated', sessionId, { ...tabState.info });
    });

    page.on('close', () => {
      session.tabs.delete(tabId);
      if (session.activeTabId === tabId) {
        session.activeTabId = [...session.tabs.keys()][0] ?? null;
      }
      this.emit('tabClosed', sessionId, tabId);
    });

    page.on('download', async (download) => {
      try {
        const suggested = download.suggestedFilename();
        const tmpPath = `/tmp/avc-download-${crypto.randomUUID()}-${suggested}`;
        await download.saveAs(tmpPath);
        const stat = await fs.stat(tmpPath);
        this.emit('download', sessionId, {
          filename: suggested,
          path: tmpPath,
          mimeType: null,
          sizeBytes: stat.size,
        });
      } catch (err) {
        logger.error('Failed to capture download', { sessionId, error: String(err) });
      }
    });

    this.emit('tabCreated', sessionId, { ...info });

    if (info.isActive) {
      await this.startScreencast(sessionId, tabId);
    }

    return info;
  }

  async newTab(sessionId: string, url = 'https://www.google.com/'): Promise<TabInfo> {
    const session = this.require(sessionId);
    const page = await session.context.newPage();
    const info = await this.registerTab(sessionId, page, url);
    await page.goto(url, { waitUntil: 'domcontentloaded' }).catch((err) => {
      logger.warn('Initial navigation failed', { sessionId, url, error: String(err) });
    });
    return info;
  }

  private async startScreencast(sessionId: string, tabId: string): Promise<void> {
    const { session, tab } = this.requireTab(sessionId, tabId);
    if (tab.screencastActive) return;
    const cdp = tab.cdp ?? (await session.context.newCDPSession(tab.page));
    tab.cdp = cdp;
    tab.screencastActive = true;

    cdp.on('Page.screencastFrame', async (frame: { data: string; sessionId: number }) => {
      this.emit('frame', sessionId, tabId, Buffer.from(frame.data, 'base64'));
      try {
        await cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId });
      } catch {
        // Session may already be torn down; safe to ignore.
      }
    });

    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: env.screencastQuality,
      maxWidth: session.viewport.width,
      maxHeight: session.viewport.height,
      everyNthFrame: 1,
    });
  }

  private async stopScreencast(sessionId: string, tabId: string): Promise<void> {
    const { tab } = this.requireTab(sessionId, tabId);
    if (!tab.screencastActive || !tab.cdp) return;
    tab.screencastActive = false;
    try {
      await tab.cdp.send('Page.stopScreencast');
    } catch {
      // ignore
    }
  }

  async closeTab(sessionId: string, tabId: string): Promise<void> {
    const { tab } = this.requireTab(sessionId, tabId);
    await tab.page.close().catch(() => undefined);
  }

  async switchTab(sessionId: string, tabId: string): Promise<void> {
    const session = this.require(sessionId);
    const previous = session.activeTabId;
    if (previous && previous !== tabId) {
      const prevTab = session.tabs.get(previous);
      if (prevTab) {
        prevTab.info.isActive = false;
        await this.stopScreencast(sessionId, previous);
      }
    }
    const { tab } = this.requireTab(sessionId, tabId);
    tab.info.isActive = true;
    session.activeTabId = tabId;
    await tab.page.bringToFront();
    await this.startScreencast(sessionId, tabId);
  }

  getTabs(sessionId: string): TabInfo[] {
    const session = this.require(sessionId);
    return [...session.tabs.values()].map((t) => ({ ...t.info })).sort((a, b) => a.position - b.position);
  }

  async navigate(sessionId: string, tabId: string, url: string): Promise<void> {
    const { tab } = this.requireTab(sessionId, tabId);
    await tab.page.goto(url, { waitUntil: 'domcontentloaded' });
  }

  async goBack(sessionId: string, tabId: string): Promise<void> {
    const { tab } = this.requireTab(sessionId, tabId);
    await tab.page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  }

  async goForward(sessionId: string, tabId: string): Promise<void> {
    const { tab } = this.requireTab(sessionId, tabId);
    await tab.page.goForward({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  }

  async reload(sessionId: string, tabId: string): Promise<void> {
    const { tab } = this.requireTab(sessionId, tabId);
    await tab.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
  }

  async sendMouseEvent(
    sessionId: string,
    tabId: string,
    evt: { action: 'move' | 'down' | 'up' | 'dblclick'; x: number; y: number; button?: 'left' | 'right' | 'middle' }
  ): Promise<void> {
    const { tab } = this.requireTab(sessionId, tabId);
    const { page } = tab;
    switch (evt.action) {
      case 'move':
        await page.mouse.move(evt.x, evt.y);
        break;
      case 'down':
        await page.mouse.move(evt.x, evt.y);
        await page.mouse.down({ button: evt.button ?? 'left' });
        break;
      case 'up':
        await page.mouse.up({ button: evt.button ?? 'left' });
        break;
      case 'dblclick':
        await page.mouse.dblclick(evt.x, evt.y, { button: evt.button ?? 'left' });
        break;
    }
  }

  async sendWheelEvent(sessionId: string, tabId: string, deltaX: number, deltaY: number): Promise<void> {
    const { tab } = this.requireTab(sessionId, tabId);
    await tab.page.mouse.wheel(deltaX, deltaY);
  }

  async sendKeyEvent(sessionId: string, tabId: string, action: 'down' | 'up', key: string): Promise<void> {
    const { tab } = this.requireTab(sessionId, tabId);
    if (action === 'down') await tab.page.keyboard.down(key);
    else await tab.page.keyboard.up(key);
  }

  async sendText(sessionId: string, tabId: string, text: string): Promise<void> {
    const { tab } = this.requireTab(sessionId, tabId);
    await tab.page.keyboard.insertText(text);
  }

  async resizeViewport(sessionId: string, tabId: string, width: number, height: number): Promise<void> {
    const session = this.require(sessionId);
    session.viewport = { width, height };
    const { tab } = this.requireTab(sessionId, tabId);
    await tab.page.setViewportSize({ width, height });
    if (tab.screencastActive) {
      await this.stopScreencast(sessionId, tabId);
      await this.startScreencast(sessionId, tabId);
    }
  }

  async clearCookies(sessionId: string): Promise<void> {
    const session = this.require(sessionId);
    await session.context.clearCookies();
  }

  /** Stops the browser process but preserves the on-disk profile (persistent sessions). */
  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.intentionalClose = true;
    await session.context.close().catch(() => undefined);
    this.sessions.delete(sessionId);
    if (env.audioEnabled) await destroySessionSink(sessionId);
  }

  /** Stops the browser and permanently deletes its profile directory (private sessions / explicit destroy). */
  async destroySession(sessionId: string): Promise<void> {
    const profileDir = this.sessions.get(sessionId)?.profileDir;
    await this.stopSession(sessionId);
    if (profileDir) {
      await fs.rm(profileDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  /**
   * Also allows the caller (SessionManager) to clean up a profile directory it
   * knows about from Postgres even if this engine instance never held that
   * session in memory (e.g. after a backend restart).
   */
  async deleteProfileDir(profileDir: string): Promise<void> {
    await fs.rm(profileDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
