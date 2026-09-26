CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'ANURAG-PC',
  device_code TEXT NOT NULL UNIQUE,
  wallpaper TEXT NOT NULL DEFAULT 'default',
  theme TEXT NOT NULL DEFAULT 'system', -- system | light | dark
  accent_color TEXT NOT NULL DEFAULT 'amber',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  language TEXT NOT NULL DEFAULT 'en',
  homepage TEXT NOT NULL DEFAULT 'https://www.google.com/',
  search_engine TEXT NOT NULL DEFAULT 'google',
  session_mode TEXT NOT NULL DEFAULT 'persistent', -- persistent | private
  pin_hash TEXT,
  first_run_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_devices_user_id ON devices (user_id);
CREATE UNIQUE INDEX idx_devices_device_code ON devices (device_code);
