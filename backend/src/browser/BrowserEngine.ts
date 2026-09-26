import { EventEmitter } from 'events';

export type SessionMode = 'persistent' | 'private';

export interface TabInfo {
  id: string;
  url: string;
  title: string;
  favicon: string | null;
  isActive: boolean;
  position: number;
}

export interface DownloadInfo {
  filename: string;
  path: string;
  mimeType: string | null;
  sizeBytes: number;
}

/**
 * Event payloads emitted by every BrowserEngine implementation. Documented
 * here rather than encoded into strict EventEmitter generics, to keep the
 * integration surface simple for consumers (the WS gateway).
 *
 *  'frame'       (sessionId, tabId, jpegBase64: string)
 *  'tabCreated'  (sessionId, tab: TabInfo)
 *  'tabUpdated'  (sessionId, tab: TabInfo)
 *  'tabClosed'   (sessionId, tabId: string)
 *  'navigation'  (sessionId, tabId, url: string, title: string)
 *  'download'    (sessionId, info: DownloadInfo)
 *  'crashed'     (sessionId)
 *  'recovered'   (sessionId)
 */
export abstract class BrowserEngine extends EventEmitter {
  abstract createSession(sessionId: string, opts: { mode: SessionMode; profileDir: string }): Promise<void>;
  abstract destroySession(sessionId: string): Promise<void>;
  abstract stopSession(sessionId: string): Promise<void>;
  abstract hasSession(sessionId: string): boolean;

  abstract newTab(sessionId: string, url?: string): Promise<TabInfo>;
  abstract closeTab(sessionId: string, tabId: string): Promise<void>;
  abstract switchTab(sessionId: string, tabId: string): Promise<void>;
  abstract getTabs(sessionId: string): TabInfo[];

  abstract navigate(sessionId: string, tabId: string, url: string): Promise<void>;
  abstract goBack(sessionId: string, tabId: string): Promise<void>;
  abstract goForward(sessionId: string, tabId: string): Promise<void>;
  abstract reload(sessionId: string, tabId: string): Promise<void>;

  abstract sendMouseEvent(
    sessionId: string,
    tabId: string,
    evt: { action: 'move' | 'down' | 'up' | 'dblclick'; x: number; y: number; button?: 'left' | 'right' | 'middle' }
  ): Promise<void>;
  abstract sendWheelEvent(sessionId: string, tabId: string, deltaX: number, deltaY: number): Promise<void>;
  abstract sendKeyEvent(sessionId: string, tabId: string, action: 'down' | 'up', key: string): Promise<void>;
  abstract sendText(sessionId: string, tabId: string, text: string): Promise<void>;
  abstract resizeViewport(sessionId: string, tabId: string, width: number, height: number): Promise<void>;

  abstract clearCookies(sessionId: string): Promise<void>;
}

export function normalizeUrl(input: string, defaultSearchEngine = 'google'): string {
  const trimmed = input.trim();
  if (!trimmed) return 'about:blank';
  const looksLikeUrl =
    /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed) || /^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(trimmed);
  if (looksLikeUrl) {
    return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  }
  const q = encodeURIComponent(trimmed);
  if (defaultSearchEngine === 'duckduckgo') return `https://duckduckgo.com/?q=${q}`;
  if (defaultSearchEngine === 'bing') return `https://www.bing.com/search?q=${q}`;
  return `https://www.google.com/search?q=${q}`;
}
