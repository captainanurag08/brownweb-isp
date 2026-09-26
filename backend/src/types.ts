export interface User {
  id: string;
  email: string;
  password_hash: string;
  failed_login_attempts: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Device {
  id: string;
  user_id: string;
  name: string;
  device_code: string;
  wallpaper: string;
  theme: 'system' | 'light' | 'dark';
  accent_color: string;
  timezone: string;
  language: string;
  homepage: string;
  search_engine: string;
  session_mode: 'persistent' | 'private';
  pin_hash: string | null;
  first_run_complete: boolean;
  created_at: Date;
  updated_at: Date;
}

export type SessionMode = 'persistent' | 'private';
export type SessionStatus = 'starting' | 'running' | 'idle' | 'stopped' | 'crashed' | 'destroyed';

export interface BrowserSessionRow {
  id: string;
  user_id: string;
  device_id: string;
  mode: SessionMode;
  status: SessionStatus;
  profile_path: string;
  created_at: Date;
  last_activity_at: Date;
  stopped_at: Date | null;
  destroyed_at: Date | null;
}

export interface BrowserTabRow {
  id: string;
  session_id: string;
  title: string;
  url: string;
  favicon: string | null;
  position: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  deviceId: string;
}

// Augment express-session's SessionData with our own fields.
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    deviceId?: string;
    csrfSecret?: string;
  }
}
