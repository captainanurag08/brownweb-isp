CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  history_retention_days INT NOT NULL DEFAULT 90,
  log_full_urls BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE device_settings (
  device_id UUID PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
  auto_lock_minutes INT NOT NULL DEFAULT 15,
  default_zoom NUMERIC NOT NULL DEFAULT 1.0,
  startup_restore_tabs BOOLEAN NOT NULL DEFAULT true,
  max_tabs INT NOT NULL DEFAULT 15,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
