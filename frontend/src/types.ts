export interface UserRecord {
  id: string;
  email: string;
}

export interface Device {
  id: string;
  name: string;
  device_code: string;
  wallpaper: string;
  theme: 'system' | 'light' | 'dark';
  accent_color: string;
  timezone: string;
  language: string;
  homepage: string;
  search_engine: 'google' | 'bing' | 'duckduckgo';
  session_mode: 'persistent' | 'private';
  pin_hash: string | null;
  first_run_complete: boolean;
}

export interface DeviceSettings {
  auto_lock_minutes: number;
  default_zoom: number;
  startup_restore_tabs: boolean;
  max_tabs: number;
}

export interface TabInfo {
  id: string;
  url: string;
  title: string;
  favicon: string | null;
  isActive: boolean;
  position: number;
}

export type AppId =
  | 'home'
  | 'browser'
  | 'files'
  | 'history'
  | 'bookmarks'
  | 'notes'
  | 'settings';

export interface ToastNotification {
  id: string;
  title: string;
  body?: string;
  tone?: 'info' | 'success' | 'danger';
}

// --- WebSocket protocol (mirrors backend/src/ws/gateway.ts) ---

export type ClientMessage =
  | { type: 'input.mouse'; tabId: string; action: 'move' | 'down' | 'up' | 'dblclick'; x: number; y: number; button?: 'left' | 'right' | 'middle' }
  | { type: 'input.wheel'; tabId: string; deltaX: number; deltaY: number }
  | { type: 'input.key'; tabId: string; action: 'down' | 'up'; key: string }
  | { type: 'input.text'; tabId: string; text: string }
  | { type: 'tab.new'; url?: string }
  | { type: 'tab.close'; tabId: string }
  | { type: 'tab.switch'; tabId: string }
  | { type: 'tab.navigate'; tabId: string; url: string }
  | { type: 'tab.back'; tabId: string }
  | { type: 'tab.forward'; tabId: string }
  | { type: 'tab.reload'; tabId: string }
  | { type: 'viewport.resize'; tabId: string; width: number; height: number };

export type ServerMessage =
  | { type: 'session.ready'; sessionId: string; tabs: TabInfo[] }
  | { type: 'tab.frame'; tabId: string; mimeType: string; data: string }
  | { type: 'tab.created'; tab: TabInfo }
  | { type: 'tab.updated'; tab: TabInfo }
  | { type: 'tab.closed'; tabId: string }
  | { type: 'navigation'; tabId: string; url: string; title: string }
  | { type: 'error'; message: string; code?: string };
